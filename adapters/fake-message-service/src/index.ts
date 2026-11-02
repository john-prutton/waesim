import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"

import { Topic, InboundMessage, MessageId, UserId, ChatId } from "@waesim/domain/index.js"

import { MessageService } from "@waesim/application/index.js"

export const FakeMessageService = Layer.effect(
  MessageService,
  Effect.gen(function* () {
    const messageQueue = yield* Queue.unbounded<InboundMessage>()

    const listeners: Set<Topic> = new Set()

    let messageId = 0

    yield* Effect.gen(function* () {
      for (const topic of listeners) {
        yield* Queue.offer(
          messageQueue,
          new InboundMessage({
            id: MessageId.make(`${messageId++}:${topic}`),
            chatId: ChatId.make(topic),
            senderId: UserId.make("user-1"),
            sentAt: new Date(),
            content: {
              _tag: "Text",
              body: `message ${messageId} for ${topic}`,
            },
          }),
        )
      }
    }).pipe(
      Effect.repeat(Schedule.forever.pipe(Schedule.addDelay(() => Effect.succeed("1 second")))),
      Effect.forkChild,
    )

    return {
      subscribeToTopic: (topic) => {
        listeners.add(topic)
        return Effect.succeed(Stream.fromQueue(messageQueue))
      },
      sendMessage: (message) => Effect.log("sending message", message),
    }
  }),
)
