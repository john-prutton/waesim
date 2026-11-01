import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"

import { ChatId, InboundMessage, MessageId, UserId } from "@waesim/domain/index.js"

import { MessageService } from "@waesim/application/index.js"

export const FakeMessageService = Layer.effect(
  MessageService,
  Effect.gen(function* () {
    const messageQueue = yield* Queue.unbounded<InboundMessage>()

    const listeners: Set<ChatId> = new Set()

    let messageId = 0

    const _ = yield* Effect.gen(function* () {
      for (const chatId of listeners) {
        yield* Queue.offer(
          messageQueue,
          new InboundMessage({
            id: MessageId.make(`${messageId++}:${chatId}`),
            chatId,
            senderId: UserId.make("user-1"),
            sentAt: new Date(),
            content: {
              _tag: "Text",
              body: `message ${messageId} for ${chatId}`,
            },
          }),
        )
      }
    }).pipe(
      Effect.repeat(Schedule.forever.pipe(Schedule.addDelay(() => Effect.succeed("1 second")))),
      Effect.forkChild,
    )

    return {
      subscribeToChat: (chatId) => {
        listeners.add(chatId)
        return Stream.fromQueue(messageQueue)
      },
      sendMessage: (message) => Effect.void,
    }
  }),
)
