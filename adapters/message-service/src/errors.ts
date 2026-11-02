import * as Data from "effect/Data"

export class ConnectionClosed extends Data.TaggedError("ConnectionClosed")<{}> {}

export class AuthStateError extends Data.TaggedError("AuthStateError")<{
  readonly cause: unknown
}> {}

export class LoggedOut extends Data.TaggedError("LoggedOut")<{}> {}
