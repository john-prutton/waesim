import * as Schema from "effect/Schema"

export const MessageId = Schema.String.pipe(Schema.brand("message-id"))
export type MessageId = typeof MessageId.Type

export const ChatId = Schema.String.pipe(Schema.brand("chat-id"))
export type ChatId = typeof ChatId.Type

export const UserId = Schema.String.pipe(Schema.brand("user-id"))
export type UserId = typeof UserId.Type

export const MessageContent = Schema.Union([
  Schema.TaggedStruct("Text", { body: Schema.String }),
  Schema.TaggedStruct("Unsupported", { waType: Schema.String }),
])

export class InboundMessage extends Schema.TaggedClass<
  InboundMessage,
  { readonly brand: unique symbol }
>()("InboundMessage", {
  id: MessageId,
  chatId: ChatId,
  senderId: UserId,
  sentAt: Schema.DateFromMillis,
  content: MessageContent,
}) {}

export class OutboundMessage extends Schema.Class<
  OutboundMessage,
  { readonly brand: unique symbol }
>("OutboundMessage")({
  chatId: ChatId,
  recipientId: UserId,
  content: Schema.String,
}) {}
