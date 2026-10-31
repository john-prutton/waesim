import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"

import { ChatId, InboundMessage, MessageId, UserId } from "@repo/domain/index.js"

import { MessageService } from "@repo/application/index.js"

export const FakeMessageService = Layer.effect(
  MessageService,
  Effect.gen(function* () {
    return {
      subscribeToChat: (chatId) =>
        Stream.make(
          new InboundMessage({
            id: MessageId.make("1"),
            chatId: ChatId.make("chat-1"),
            senderId: UserId.make("user-1"),
            sentAt: new Date(),
            content: {
              _tag: "Text",
              body: "test",
            },
          }),
        ),
      sendMessage: (message) => Effect.void,
    }
  }),
)
