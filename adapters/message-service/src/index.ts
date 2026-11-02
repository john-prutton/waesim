import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"

import { ChatId, InboundMessage, MessageId, Topic, UserId } from "@waesim/domain/index.js"

import {
  MessageService,
  MessageSendFailed,
  TopicSubscriptionFailed,
} from "@waesim/application/index.js"

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type BaileysEventMap,
  type WAMessage,
} from "@whiskeysockets/baileys"
import qrcode from "qrcode-terminal"

import { ConnectionClosed, LoggedOut, AuthStateError } from "./errors.js"
import { Closed, CredsChanged, Malformed, QrCode, type Signal } from "./signals.js"

type WASocket = ReturnType<typeof makeWASocket>

const toInboundMessage = (message: WAMessage): InboundMessage | null => {
  const { key } = message
  if (key.fromMe || !key.id || !key.remoteJid) return null

  const body = message.message?.conversation ?? message.message?.extendedTextMessage?.text
  if (!body) return null

  return new InboundMessage({
    id: MessageId.make(key.id),
    chatId: ChatId.make(key.remoteJid),
    senderId: UserId.make(key.participant ?? key.remoteJid),
    sentAt: new Date(1000 * Number(message.messageTimestamp ?? 0)),
    content: { _tag: "Text", body },
  })
}

const inboundMessages = (sock: WASocket): Stream.Stream<InboundMessage | Malformed> =>
  Stream.callback<InboundMessage | Malformed>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const onUpsert = ({ type, messages }: BaileysEventMap["messages.upsert"]) => {
          if (type !== "notify") return

          for (const raw of messages) {
            try {
              const message = toInboundMessage(raw)

              if (message) Queue.offerUnsafe(queue, message)
            } catch (error) {
              Queue.offerUnsafe(queue, new Malformed({ error }))
            }
          }
        }
        sock.ev.on("messages.upsert", onUpsert)
        return onUpsert
      }),
      (onUpsert) => Effect.sync(() => sock.ev.off("messages.upsert", onUpsert)),
    ),
  )

const statusCodeOf = (error: unknown): number | undefined =>
  (error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode

export const WhatsAppMessageService = Layer.effect(
  MessageService,
  Effect.gen(function* () {
    const auth = yield* Effect.tryPromise({
      try: () => useMultiFileAuthState("auth_info_baileys"),
      catch: () => "error",
    })

    const saveCreds = Effect.tryPromise({
      try: () => auth.saveCreds(),
      catch: (cause) => new AuthStateError({ cause }),
    }).pipe(Effect.tapError(Effect.logError), Effect.ignore)

    const sockRef = yield* SubscriptionRef.make(Option.none<WASocket>())

    const handleSignal = (signal: Signal): Effect.Effect<void, ConnectionClosed | LoggedOut> => {
      switch (signal._tag) {
        case "CredsChanged":
          return saveCreds
        case "QrCode":
          return Effect.sync(() => qrcode.generate(signal.qr, { small: true }))
        case "Closed":
          return Effect.fail(signal.loggedOut ? new LoggedOut() : new ConnectionClosed())
      }
    }

    const session = Effect.gen(function* () {
      const signals = yield* Queue.unbounded<Signal>()

      const sock = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          yield* Effect.log("ws starting")
          yield* Effect.sleep("5 seconds")

          const sock = makeWASocket({ auth: auth.state })

          sock.ev.on("creds.update", () => Queue.offerUnsafe(signals, new CredsChanged()))

          sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
            if (qr) Queue.offerUnsafe(signals, new QrCode({ qr }))

            if (connection === "close") {
              const loggedOut = statusCodeOf(lastDisconnect?.error) === DisconnectReason.loggedOut
              Queue.offerUnsafe(signals, new Closed({ loggedOut }))
            }
          })

          return sock
        }),
        (sock) =>
          Effect.gen(function* () {
            yield* SubscriptionRef.set(sockRef, Option.none())
            yield* Effect.sync(() => {
              sock.ev.removeAllListeners("creds.update")
              sock.ev.removeAllListeners("connection.update")
              sock.end(undefined)
            })
            yield* Effect.log("ws closed")
          }),
      )

      yield* SubscriptionRef.set(sockRef, Option.some(sock))

      yield* Stream.fromQueue(signals).pipe(Stream.runForEach(handleSignal))
    })

    yield* Effect.scoped(session).pipe(
      Effect.retry(($) =>
        $(Schedule.exponential("500 millis")).pipe(
          Schedule.jittered,
          Schedule.upTo({ duration: Duration.seconds(30) }),
          Schedule.while(({ input }) => input._tag === "ConnectionClosed"),
        ),
      ),
      Effect.tapError((error) => Effect.logError("whatsapp connection stopped", error)),
      Effect.ignore,
      Effect.forkScoped,
    )

    const messages = yield* SubscriptionRef.changes(sockRef).pipe(
      Stream.flatMap((sock) => (Option.isNone(sock) ? Stream.empty : inboundMessages(sock.value))),
      Stream.tap((event) =>
        event._tag === "Malformed"
          ? Effect.logWarning("dropped malformed message", event.error)
          : Effect.void,
      ),
      Stream.filter((signal) => signal._tag === "InboundMessage"),
      Stream.toPubSub({ capacity: 256, strategy: "sliding" }),
    )

    const getGroupJidFromSubject = (topic: Topic) =>
      Effect.gen(function* () {
        const maybeSock = yield* SubscriptionRef.get(sockRef)
        if (Option.isNone(maybeSock))
          return yield* new TopicSubscriptionFailed({ reason: "Socket not connected, retry" })

        const groups = yield* Effect.tryPromise(() =>
          maybeSock.value.groupFetchAllParticipating(),
        ).pipe(
          Effect.tapError((cause) => Effect.logError("baileys failed to get groups", cause)),
          Effect.mapError(
            () => new TopicSubscriptionFailed({ reason: "Failed to get groups, check logs" }),
          ),
        )

        const result = Object.entries(groups).find(([id, metadata]) => metadata.subject === topic)
        if (!result)
          return yield* new TopicSubscriptionFailed({ reason: "Chat not found with id " + topic })

        return result[0]
      })

    return {
      subscribeToTopic: (topic) =>
        Effect.gen(function* () {
          const chatId = yield* getGroupJidFromSubject(topic)
          return Stream.fromPubSub(messages).pipe(
            Stream.filter((message) => message.chatId === chatId),
          )
        }),

      sendMessage: (message) =>
        Effect.gen(function* () {
          const maybeSock = yield* SubscriptionRef.get(sockRef)
          if (Option.isNone(maybeSock))
            return yield* new MessageSendFailed({ reason: "Socket not connected, retry" })

          yield* Effect.tryPromise(() =>
            maybeSock.value.sendMessage(message.chatId, { text: message.content.body }),
          ).pipe(
            Effect.tapError((cause) => Effect.logError("Baileys send failed", cause)),
            Effect.mapError(() => new MessageSendFailed({ reason: "Rejected" })),
          )
        }),
    }
  }),
)
