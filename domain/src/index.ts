import * as Schema from "effect/Schema"

export const MessageId = Schema.String.pipe(Schema.brand("MessageId"))
export type MessageId = typeof MessageId.Type

export const Topic = Schema.String.pipe(Schema.brand("Topic"))
export type Topic = typeof Topic.Type

export const ChatId = Schema.String.pipe(Schema.brand("ChatId"))
export type ChatId = typeof ChatId.Type

export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export type MessageContent = typeof MessageContent.Type
export const MessageContent = Schema.Union([Schema.TaggedStruct("Text", { body: Schema.String })])

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
  content: MessageContent,
}) {}

export const makeMessageReply = ({
  content,
  inboundMessage,
}: {
  inboundMessage: InboundMessage
  content: MessageContent
}) =>
  new OutboundMessage({
    chatId: inboundMessage.chatId,
    recipientId: inboundMessage.senderId,
    content,
  })
