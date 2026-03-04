export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export type PathSegment = string | number
export type Path = PathSegment[]
export type HiddenPath = PathSegment[]

export type MatchType = 'key' | 'value' | 'both'

export interface Match {
  path: Path
  key: PathSegment
  value: JsonValue
  matchType: MatchType
  id?: string
}

export interface Source {
  name?: string
  url?: string
}
