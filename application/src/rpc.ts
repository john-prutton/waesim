import { Rpc, RpcGroup, RpcServer } from "effect/rpc"

import { ChatId, InboundMessage } from "@repo/domain/index.js"

export class MessageRpcGroup extends RpcGroup.make(
  Rpc.make("SubscribeToChat", {
    payload: { chatId: ChatId },
    success: InboundMessage,
    stream: true,
  }),
) { }
