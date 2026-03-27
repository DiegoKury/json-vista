import { describe, it, expect } from 'vitest'
import {
  isObject,
  isArray,
  isCollectionEmpty,
  cleanData,
  getGeneralizedSegment,
  getIndentationStyle,
  hasCircularReference,
} from '../src/utils/utils'
import type { JsonValue } from '../src/types'

// ── isObject ───────────────────────────────────────────────

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
    expect(isObject({ nested: { deep: true } })).toBe(true)
  })

  it('returns false for arrays', () => {
    expect(isObject([])).toBe(false)
    expect(isObject([1, 2, 3])).toBe(false)
  })

  it('returns false for null', () => {
    expect(isObject(null)).toBe(false)
  })

  it('returns false for primitives', () => {
    expect(isObject('string' as JsonValue)).toBe(false)
    expect(isObject(42 as JsonValue)).toBe(false)
    expect(isObject(true as JsonValue)).toBe(false)
  })
})

// ── isArray ────────────────────────────────────────────────

describe('isArray', () => {
  it('returns true for arrays', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2])).toBe(true)
    expect(isArray([{ a: 1 }])).toBe(true)
  })

  it('returns false for objects', () => {
    expect(isArray({})).toBe(false)
    expect(isArray({ length: 0 })).toBe(false)
  })

  it('returns false for null and primitives', () => {
    expect(isArray(null)).toBe(false)
    expect(isArray('hello' as JsonValue)).toBe(false)
    expect(isArray(123 as JsonValue)).toBe(false)
  })
})

// ── isCollectionEmpty ──────────────────────────────────────

describe('isCollectionEmpty', () => {
  it('returns true for null', () => {
    expect(isCollectionEmpty(null)).toBe(true)
  })

  it('returns true for empty array', () => {
    expect(isCollectionEmpty([])).toBe(true)
  })

  it('returns true for empty object', () => {
    expect(isCollectionEmpty({})).toBe(true)
  })

  it('returns false for non-empty array', () => {
    expect(isCollectionEmpty([1])).toBe(false)
  })

  it('returns false for non-empty object', () => {
    expect(isCollectionEmpty({ a: 1 })).toBe(false)
  })

  it('returns true for primitives (non-collection)', () => {
    expect(isCollectionEmpty('hello' as JsonValue)).toBe(true)
    expect(isCollectionEmpty(42 as JsonValue)).toBe(true)
    expect(isCollectionEmpty(true as JsonValue)).toBe(true)
  })
})

// ── cleanData ──────────────────────────────────────────────

describe('cleanData', () => {
  it('removes originalIndex from objects', () => {
    const data = { originalIndex: 5, name: 'test', value: 42 }
    const cleaned = cleanData(data) as Record<string, JsonValue>
    expect(cleaned).toEqual({ name: 'test', value: 42 })
    expect('originalIndex' in cleaned).toBe(false)
  })

  it('preserves objects without originalIndex', () => {
    const data = { name: 'test', value: 42 }
    expect(cleanData(data)).toEqual({ name: 'test', value: 42 })
  })

  it('returns non-object values unchanged', () => {
    expect(cleanData('hello')).toBe('hello')
    expect(cleanData(42)).toBe(42)
    expect(cleanData(null)).toBe(null)
    expect(cleanData(true)).toBe(true)
  })

  it('returns arrays unchanged', () => {
    const arr = [1, 2, 3]
    expect(cleanData(arr)).toBe(arr)
  })
})

// ── getGeneralizedSegment ──────────────────────────────────

describe('getGeneralizedSegment', () => {
  it('replaces numeric indices with *', () => {
    expect(getGeneralizedSegment(0)).toBe('*')
    expect(getGeneralizedSegment(42)).toBe('*')
    expect(getGeneralizedSegment('0')).toBe('*')
    expect(getGeneralizedSegment('123')).toBe('*')
  })

  it('replaces UUIDs with *', () => {
    expect(getGeneralizedSegment('550e8400-e29b-41d4-a716-446655440000')).toBe('*')
    expect(getGeneralizedSegment('ABCDEF01-2345-6789-abcd-ef0123456789')).toBe('*')
  })

  it('returns string keys unchanged', () => {
    expect(getGeneralizedSegment('name')).toBe('name')
    expect(getGeneralizedSegment('id')).toBe('id')
    expect(getGeneralizedSegment('some-key')).toBe('some-key')
    expect(getGeneralizedSegment('camelCase')).toBe('camelCase')
  })

  it('does not match partial UUIDs', () => {
    expect(getGeneralizedSegment('550e8400-e29b-41d4')).toBe('550e8400-e29b-41d4')
    expect(getGeneralizedSegment('not-a-uuid-at-all-really')).toBe('not-a-uuid-at-all-really')
  })

  it('treats negative numbers as strings', () => {
    expect(getGeneralizedSegment('-1')).toBe('*')
  })

  it('treats float strings as numeric', () => {
    expect(getGeneralizedSegment('3.14')).toBe('*')
  })
})

// ── getIndentationStyle ────────────────────────────────────

describe('getIndentationStyle', () => {
  it('returns 0 padding for depth 0', () => {
    expect(getIndentationStyle(0)).toBe('padding-left: 0px')
  })

  it('returns 20px per depth level', () => {
    expect(getIndentationStyle(1)).toBe('padding-left: 20px')
    expect(getIndentationStyle(2)).toBe('padding-left: 40px')
    expect(getIndentationStyle(5)).toBe('padding-left: 100px')
  })
})

// ── hasCircularReference ───────────────────────────────────

describe('hasCircularReference', () => {
  it('returns false for primitives', () => {
    expect(hasCircularReference(null)).toBe(false)
    expect(hasCircularReference('hello')).toBe(false)
    expect(hasCircularReference(42)).toBe(false)
    expect(hasCircularReference(true)).toBe(false)
  })

  it('returns false for simple objects', () => {
    expect(hasCircularReference({ a: 1, b: 'two' })).toBe(false)
  })

  it('returns false for simple arrays', () => {
    expect(hasCircularReference([1, 2, 3])).toBe(false)
  })

  it('returns false for deeply nested structures', () => {
    expect(hasCircularReference({ a: { b: { c: { d: [1, 2] } } } })).toBe(false)
  })

  it('detects self-referencing objects', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(hasCircularReference(obj as JsonValue)).toBe(true)
  })

  it('detects circular references in arrays', () => {
    const arr: unknown[] = [1, 2]
    arr.push(arr)
    expect(hasCircularReference(arr as JsonValue)).toBe(true)
  })

  it('detects deeply nested circular references', () => {
    const inner: Record<string, unknown> = { value: 42 }
    const outer = { level1: { level2: { level3: inner } } }
    inner.back = outer
    expect(hasCircularReference(outer as JsonValue)).toBe(true)
  })

  it('handles shared references (non-circular) correctly', () => {
    const shared = { x: 1 }
    const data = { a: shared, b: shared }
    // shared is referenced twice but not circular
    expect(hasCircularReference(data)).toBe(false)
  })
})
