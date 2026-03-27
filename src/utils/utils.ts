import type { JsonValue } from '../types'

export const isObject = (val: JsonValue): val is Record<string, JsonValue> =>
  val !== null && typeof val === 'object' && !Array.isArray(val)

export const isArray = (val: JsonValue): val is JsonValue[] => Array.isArray(val)

export const isCollectionEmpty = (value: JsonValue): boolean => {
  if (value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return true
}

export const cleanData = (data: JsonValue): JsonValue => {
  if (isObject(data)) {
    const { originalIndex: _removed, ...rest } = data as Record<string, JsonValue>
    return rest
  }
  return data
}

// Replaces numeric array indices and UUIDs with '*' for path pattern matching
export const getGeneralizedSegment = (segment: string | number): string => {
  const s = String(segment)
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)
  return isUUID || !isNaN(Number(s)) ? '*' : s
}

export const getIndentationStyle = (depth: number): string =>
  `padding-left: ${depth * 20}px`

export const hasCircularReference = (value: JsonValue, seen = new WeakSet<object>()): boolean => {
  if (value === null || typeof value !== 'object') return false
  if (seen.has(value)) return true
  seen.add(value)
  if (Array.isArray(value)) return value.some(item => hasCircularReference(item, seen))
  return Object.values(value as Record<string, JsonValue>).some(v => hasCircularReference(v, seen))
}
