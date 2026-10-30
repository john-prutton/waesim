import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"

import { ChatId, InboundMessage, MessageId, UserId } from "@repo/domain/index.js"

import { MessageService } from "@repo/application/index.js"

import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"

import { ConnectionClosed } from "./errors.js"
import { ConnectionUpdate, CredsUpdate, Events } from "./schema.js"

export const WhatsAppMessageService = Layer.effect(
  MessageService,
  Effect.gen(function* () {
    const auth = yield* Effect.tryPromise({
      try: () => useMultiFileAuthState("auth_info_baileys"),
      catch: () => "error",
    })

    const messages = yield* Stream.callback<Events>((queue) =>
      Effect.acquireRelease(
        Effect.gen(function* () {
          yield* Effect.log("ws started")

          const sock = makeWASocket({ auth: auth.state })

          sock.ev.on("creds.update", () => Queue.offerUnsafe(queue, new CredsUpdate()))

          sock.ev.on("connection.update", ({ connection }) => {
            Queue.offerUnsafe(queue, new ConnectionUpdate({ connection }))
          })

          sock.ev.on("messages.upsert", async (event) => {
            if (event.type !== "notify") return

            for (const message of event.messages) {
              if (message.key.fromMe) continue

              const chatId = message.key.participant
                ? await sock
                    .groupFetchAllParticipating()
                    .then((groups) => groups[message.key.remoteJid!])
                    .then((group) => group.subject)
                : message.key.remoteJid!

              Queue.offerUnsafe(
                queue,
                new InboundMessage({
                  id: MessageId.make(message.key.id!),
                  chatId: ChatId.make(chatId),
                  senderId: UserId.make(message.key.participant || message.key.remoteJid!),
                  sentAt: new Date(1000 * (message.messageTimestamp! as number)),
                  content: { _tag: "Text", body: message.message!.conversation! },
                }),
              )
            }
          })

          return sock
        }),
        (sock) => Effect.promise(sock.ws.close).pipe(Effect.tap(() => Effect.log("ws closed"))),
      ),
    ).pipe(
      Stream.mapEffect((event) =>
        event._tag === "ConnectionUpdate" && event.connection === "close"
          ? Effect.fail(new ConnectionClosed())
          : Effect.succeed(event),
      ),
      // Stream.tap((event) => Effect.log(event)),
      Stream.tap((event) =>
        event._tag === "ConnectionUpdate" ? Effect.promise(auth.saveCreds) : Effect.void,
      ),
      Stream.filter((event) => event._tag === "InboundMessage"),
      Stream.retry(Schedule.exponential("500 millis")),
      Stream.toPubSub({ capacity: "unbounded" }),
    )

    return {
      subscribeToChat: (chatId) =>
        Stream.fromPubSub(messages).pipe(Stream.filter((message) => message.chatId === chatId)),

      sendMessage: (message) => Effect.void,
    }
  }),
)
