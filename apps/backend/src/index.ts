import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

import { ChatId } from "@repo/domain/index.js"

import { MessageService } from "@repo/application/index.js"

import { WhatsAppMessageService } from "@repo/message-service/index.js"

Effect.gen(function* () {
  const { subscribeToChat } = yield* MessageService

  yield* subscribeToChat(ChatId.make("13159930806317@lid")).pipe(
    Stream.runForEach((message) => Effect.log("DM:", message)),
    Effect.forkChild,
  )

  yield* subscribeToChat(ChatId.make("Test group")).pipe(
    Stream.runForEach((message) => Effect.log("Test group:", message)),
    Effect.forkChild,
  )

  yield* Effect.sleep("Infinity")
}).pipe(Effect.provide(WhatsAppMessageService), Effect.runPromise)
