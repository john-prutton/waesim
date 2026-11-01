import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Layer from "effect/Layer"
import * as RpcSerialization from "effect/rpc/RpcSerialization"
import * as RpcServer from "effect/rpc/RpcServer"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"

import { MessageService } from "@waesim/application/index.js"
import { MessageRpcGroup } from "@waesim/application/rpc-contract.js"

import { FakeMessageService } from "@waesim/fake-message-service/index.js"
import { WhatsAppMessageService } from "@waesim/message-service/index.js"

import { createServer } from "node:http"

const ApiRoutes = HttpRouter.use((router) =>
  router.add("GET", "/health", ({}) => HttpServerResponse.json({ ok: true })),
)

const RpcRoutes = RpcServer.layerHttp({
  group: MessageRpcGroup,
  path: "/rpc",
  protocol: "websocket",
})

const RpcRoutesLive = MessageRpcGroup.toLayer(
  Effect.gen(function* () {
    const messageService = yield* MessageService

    return {
      SubscribeToChat: ({ chatId }) => messageService.subscribeToChat(chatId),
      sendMessage: () => Effect.void,
    }
  }),
)

const AllRoutes = Layer.mergeAll(ApiRoutes, RpcRoutes)

HttpRouter.serve(AllRoutes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(RpcRoutesLive),
  Layer.provide(FakeMessageService),
  // Layer.provide(WhatsAppMessageService),
  Layer.launch,
  Effect.runPromise,
)
