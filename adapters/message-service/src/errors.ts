import * as Data from "effect/Data"

export class ConnectionClosed extends Data.TaggedError("ConnectionClosed")<{}> {}
