import * as Schema from "effect/Schema"

import { InboundMessage } from "@waesim/domain/index.js"

export class CredsUpdate extends Schema.TaggedClass<
  CredsUpdate,
  { readonly brand: unique symbol }
>()("CredsUpdate", {}) {}

export class ConnectionUpdate extends Schema.TaggedClass<
  ConnectionUpdate,
  { readonly brand: unique symbol }
>()("ConnectionUpdate", {
  connection: Schema.Union([Schema.Literals(["open", "close", "connecting"]), Schema.Undefined]),
}) {}

export type Events = typeof Events.Type
export const Events = Schema.Union([CredsUpdate, ConnectionUpdate, InboundMessage])
