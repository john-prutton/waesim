import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

import type { ChatId, InboundMessage, OutboundMessage } from "@repo/domain/index.js"

export class MessageService extends Context.Service<
  MessageService,
  {
    readonly subscribeToChat: (chatId: ChatId) => Stream.Stream<InboundMessage>
    readonly sendMessage: (outboundMessage: OutboundMessage) => Effect.Effect<void>
  }
>()("@repo/application/MessageService") {}
