import * as Layer from "effect/Layer"
import * as RpcClient from "effect/rpc/RpcClient"
import * as RpcSerialization from "effect/rpc/RpcSerialization"

import * as NodeSocket from "@effect/platform-node/NodeSocket"

import { MessageRpcGroup } from "@waesim/application/rpc-contract.js"

export * from "@waesim/domain/index.js"

export const WaesimClient = RpcClient.make(MessageRpcGroup)

export const WaesimLayer = (url: string) =>
  RpcClient.layerProtocolSocket().pipe(
    Layer.provide(NodeSocket.layerWebSocket(url)),
    Layer.provide(RpcSerialization.layerJson),
  )
