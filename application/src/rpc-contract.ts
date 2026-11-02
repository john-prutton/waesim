import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"

import { Topic, InboundMessage, OutboundMessage } from "@waesim/domain/index.js"

import { TopicSubscriptionFailed, MessageSendFailed } from "./index.js"

export class MessageRpcGroup extends RpcGroup.make(
  Rpc.make("subscribeToTopic", {
    payload: { topic: Topic },
    success: InboundMessage,
    error: TopicSubscriptionFailed,
    stream: true,
  }),

  Rpc.make("sendMessage", {
    payload: { outboundMessage: OutboundMessage },
    error: MessageSendFailed,
  }),
) {}
