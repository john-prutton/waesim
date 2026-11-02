import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

import type { InboundMessage, OutboundMessage, Topic } from "@waesim/domain/index.js"

export class MessageSendFailed extends Schema.TaggedError<
  MessageSendFailed,
  { readonly brand: unique symbol }
>()("MessageSendFailed", {
  reason: Schema.String,
}) {}

export class TopicSubscriptionFailed extends Schema.TaggedError<
  TopicSubscriptionFailed,
  { readonly brand: unique symbol }
>()("TopicSubscriptionFailed", {
  reason: Schema.String,
}) {}

export class MessageService extends Context.Service<
  MessageService,
  {
    readonly subscribeToTopic: (
      topicId: Topic,
    ) => Effect.Effect<Stream.Stream<InboundMessage>, TopicSubscriptionFailed>
    readonly sendMessage: (
      outboundMessage: OutboundMessage,
    ) => Effect.Effect<void, MessageSendFailed>
  }
>()("@waesim/application/MessageService") {}
