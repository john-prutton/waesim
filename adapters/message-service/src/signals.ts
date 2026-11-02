import * as Data from "effect/Data"

export class CredsChanged extends Data.TaggedClass("CredsChanged")<{}> {}
export class QrCode extends Data.TaggedClass("QrCode")<{ readonly qr: string }> {}
export class Closed extends Data.TaggedClass("Closed")<{ readonly loggedOut: boolean }> {}
export type Signal = CredsChanged | QrCode | Closed

export class Malformed extends Data.TaggedClass("Malformed")<{ readonly error: unknown }> {}
