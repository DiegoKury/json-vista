import { describe, it, expect } from 'vitest'
import { isPathHidden, cleanPath, pathsAreEqual } from '../src/utils/path-utils'

// ── isPathHidden ───────────────────────────────────────────

describe('isPathHidden', () => {
  it('returns false with no hidden paths', () => {
    expect(isPathHidden(['users', 'name'], [])).toBe(false)
  })

  it('returns false with undefined hidden paths', () => {
    expect(isPathHidden(['users', 'name'])).toBe(false)
  })

  it('matches exact paths', () => {
    expect(isPathHidden(['users', 'name'], [['users', 'name']])).toBe(true)
  })

  it('does not match different paths', () => {
    expect(isPathHidden(['users', 'name'], [['users', 'email']])).toBe(false)
  })

  it('does not match paths of different lengths', () => {
    expect(isPathHidden(['users'], [['users', 'name']])).toBe(false)
    expect(isPathHidden(['users', 'name', 'first'], [['users', 'name']])).toBe(false)
  })

  it('matches wildcard patterns', () => {
    expect(isPathHidden(['users', 'name'], [['*', 'name']])).toBe(true)
    expect(isPathHidden(['items', 'name'], [['*', 'name']])).toBe(true)
  })

  it('matches multiple wildcards', () => {
    expect(isPathHidden([0, 'data', 'id'], [['*', '*', 'id']])).toBe(true)
  })

  it('wildcard does not match at different positions', () => {
    expect(isPathHidden(['users', 'name'], [['users', '*']])).toBe(true)
    expect(isPathHidden(['users', 'email'], [['users', '*']])).toBe(true)
  })

  it('matches if any hidden path matches', () => {
    expect(isPathHidden(
      ['a', 'b'],
      [['x', 'y'], ['a', 'b'], ['c', 'd']]
    )).toBe(true)
  })

  it('handles numeric path segments', () => {
    expect(isPathHidden([0, 'id'], [['*', 'id']])).toBe(true)
    expect(isPathHidden([0, 'id'], [[0, 'id']])).toBe(true)
  })

  it('handles empty path', () => {
    expect(isPathHidden([], [[]])).toBe(true)
    expect(isPathHidden([], [['a']])).toBe(false)
  })
})

// ── cleanPath ──────────────────────────────────────────────

describe('cleanPath', () => {
  it('generalizes numeric segments to *', () => {
    expect(cleanPath([0, 'name'])).toEqual(['*', 'name'])
    expect(cleanPath([1, 2, 'value'])).toEqual(['*', '*', 'value'])
  })

  it('generalizes UUID segments to *', () => {
    expect(cleanPath(['550e8400-e29b-41d4-a716-446655440000', 'data']))
      .toEqual(['*', 'data'])
  })

  it('preserves string segments', () => {
    expect(cleanPath(['users', 'name'])).toEqual(['users', 'name'])
  })

  it('handles empty path', () => {
    expect(cleanPath([])).toEqual([])
  })

  it('handles mixed segments', () => {
    expect(cleanPath(['items', 0, 'details', 1, 'value']))
      .toEqual(['items', '*', 'details', '*', 'value'])
  })
})

// ── pathsAreEqual ──────────────────────────────────────────

describe('pathsAreEqual', () => {
  it('matches identical paths', () => {
    expect(pathsAreEqual(['a', 'b'], ['a', 'b'])).toBe(true)
  })

  it('rejects different paths', () => {
    expect(pathsAreEqual(['a', 'b'], ['a', 'c'])).toBe(false)
  })

  it('rejects different length paths', () => {
    expect(pathsAreEqual(['a'], ['a', 'b'])).toBe(false)
    expect(pathsAreEqual(['a', 'b'], ['a'])).toBe(false)
  })

  it('wildcard in first path matches any segment', () => {
    expect(pathsAreEqual(['*', 'b'], ['anything', 'b'])).toBe(true)
  })

  it('wildcard in second path matches any segment', () => {
    expect(pathsAreEqual(['a', 'b'], ['a', '*'])).toBe(true)
  })

  it('wildcards on both sides match', () => {
    expect(pathsAreEqual(['*', '*'], ['x', 'y'])).toBe(true)
  })

  it('handles empty paths', () => {
    expect(pathsAreEqual([], [])).toBe(true)
  })

  it('handles numeric segments', () => {
    expect(pathsAreEqual([0, 'id'], [0, 'id'])).toBe(true)
    expect(pathsAreEqual([0, 'id'], [1, 'id'])).toBe(false)
    expect(pathsAreEqual(['*', 'id'], [0, 'id'])).toBe(true)
  })
})
