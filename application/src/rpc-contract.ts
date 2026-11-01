import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"

import { ChatId, InboundMessage, OutboundMessage } from "@waesim/domain/index.js"

export class MessageRpcGroup extends RpcGroup.make(
  Rpc.make("SubscribeToChat", {
    payload: { chatId: ChatId },
    success: InboundMessage,
    stream: true,
  }),

  Rpc.make("sendMessage", {
    payload: { outboundMessage: OutboundMessage },
  }),
) {}
