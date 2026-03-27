import { describe, it, expect, vi, beforeEach } from 'vitest'
import { State } from '../src/state'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

// ── Constructor & persistence ──────────────────────────────

describe('constructor', () => {
  it('initializes with default values', () => {
    const state = new State()
    expect(state.hiddenPaths).toEqual([])
    expect(state.isPatternHideMode).toBe(true)
    expect(state.previewHidden).toBe(false)
    expect(state.expandToMatch).toBe(false)
    expect(state.collapseDepth).toBe(null)
    expect(state.firstMatchPath).toBe(null)
    expect(state.expandToPath).toBe(null)
    expect(state.showNullValues).toBe(false)
  })

  it('loads hidden paths from localStorage', () => {
    localStorage.setItem('hiddenPaths', JSON.stringify([['*', 'id']]))
    const state = new State()
    expect(state.hiddenPaths).toEqual([['*', 'id']])
  })

  it('loads hidden paths from sessionStorage', () => {
    sessionStorage.setItem('hideProps', JSON.stringify([['*', 'secret']]))
    const state = new State()
    expect(state.hiddenPaths).toEqual([['*', 'secret']])
  })

  it('merges localStorage and sessionStorage paths', () => {
    localStorage.setItem('hiddenPaths', JSON.stringify([['*', 'id']]))
    sessionStorage.setItem('hideProps', JSON.stringify([['*', 'secret']]))
    const state = new State()
    expect(state.hiddenPaths).toEqual([['*', 'id'], ['*', 'secret']])
  })

  it('deduplicates paths from both storage sources', () => {
    localStorage.setItem('hiddenPaths', JSON.stringify([['*', 'id']]))
    sessionStorage.setItem('hideProps', JSON.stringify([['*', 'id']]))
    const state = new State()
    expect(state.hiddenPaths).toEqual([['*', 'id']])
  })

  it('clears sessionStorage hideProps after loading', () => {
    sessionStorage.setItem('hideProps', JSON.stringify([['*', 'test']]))
    new State()
    expect(sessionStorage.getItem('hideProps')).toBe(null)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('hiddenPaths', 'not valid json{{{')
    expect(() => new State()).not.toThrow()
  })

  it('handles non-array localStorage value', () => {
    localStorage.setItem('hiddenPaths', '"string"')
    const state = new State()
    expect(state.hiddenPaths).toEqual([])
  })

  it('handles non-array sessionStorage value', () => {
    sessionStorage.setItem('hideProps', '42')
    const state = new State()
    expect(state.hiddenPaths).toEqual([])
  })
})

// ── subscribe / notify ─────────────────────────────────────

describe('subscribe', () => {
  it('calls listener on state change', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.setShowNullValues(true)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('calls multiple listeners', () => {
    const state = new State()
    const l1 = vi.fn()
    const l2 = vi.fn()
    state.subscribe(l1)
    state.subscribe(l2)
    state.setShowNullValues(true)
    expect(l1).toHaveBeenCalledOnce()
    expect(l2).toHaveBeenCalledOnce()
  })

  it('returns unsubscribe function', () => {
    const state = new State()
    const listener = vi.fn()
    const unsub = state.subscribe(listener)
    unsub()
    state.setShowNullValues(true)
    expect(listener).not.toHaveBeenCalled()
  })

  it('unsubscribe only removes the specific listener', () => {
    const state = new State()
    const l1 = vi.fn()
    const l2 = vi.fn()
    const unsub1 = state.subscribe(l1)
    state.subscribe(l2)
    unsub1()
    state.setShowNullValues(true)
    expect(l1).not.toHaveBeenCalled()
    expect(l2).toHaveBeenCalledOnce()
  })
})

// ── setHiddenPaths ─────────────────────────────────────────

describe('setHiddenPaths', () => {
  it('updates hiddenPaths and persists to localStorage', () => {
    const state = new State()
    state.setHiddenPaths([['*', 'id']])
    expect(state.hiddenPaths).toEqual([['*', 'id']])
    expect(JSON.parse(localStorage.getItem('hiddenPaths')!)).toEqual([['*', 'id']])
  })

  it('notifies listeners', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.setHiddenPaths([['a']])
    expect(listener).toHaveBeenCalledOnce()
  })
})

// ── toggleHidePath ─────────────────────────────────────────

describe('toggleHidePath', () => {
  it('adds a path when not present', () => {
    const state = new State()
    state.toggleHidePath(['users', 'name'])
    expect(state.hiddenPaths).toEqual([['users', 'name']])
  })

  it('removes a path when already present', () => {
    const state = new State()
    state.toggleHidePath(['users', 'name'])
    state.toggleHidePath(['users', 'name'])
    expect(state.hiddenPaths).toEqual([])
  })

  it('matches paths with wildcards for removal', () => {
    const state = new State()
    state.setHiddenPaths([['*', 'id']])
    state.toggleHidePath(['*', 'id'])
    expect(state.hiddenPaths).toEqual([])
  })

  it('persists changes', () => {
    const state = new State()
    state.toggleHidePath(['x', 'y'])
    expect(JSON.parse(localStorage.getItem('hiddenPaths')!)).toEqual([['x', 'y']])
  })
})

// ── resetHiddenPaths ───────────────────────────────────────

describe('resetHiddenPaths', () => {
  it('clears all hidden paths', () => {
    const state = new State()
    state.setHiddenPaths([['a'], ['b'], ['c']])
    state.resetHiddenPaths()
    expect(state.hiddenPaths).toEqual([])
  })

  it('persists empty array to localStorage', () => {
    const state = new State()
    state.setHiddenPaths([['a']])
    state.resetHiddenPaths()
    expect(JSON.parse(localStorage.getItem('hiddenPaths')!)).toEqual([])
  })
})

// ── toggleHideMode ─────────────────────────────────────────

describe('toggleHideMode', () => {
  it('toggles previewHidden and isPatternHideMode', () => {
    const state = new State()
    expect(state.isPatternHideMode).toBe(true)
    expect(state.previewHidden).toBe(false)
    state.toggleHideMode()
    expect(state.isPatternHideMode).toBe(false)
    expect(state.previewHidden).toBe(true)
  })

  it('toggles back', () => {
    const state = new State()
    state.toggleHideMode()
    state.toggleHideMode()
    expect(state.isPatternHideMode).toBe(true)
    expect(state.previewHidden).toBe(false)
  })

  it('notifies listeners', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.toggleHideMode()
    expect(listener).toHaveBeenCalledOnce()
  })
})

// ── Individual setters ─────────────────────────────────────

describe('setters', () => {
  it('setExpandToMatch', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.setExpandToMatch(true)
    expect(state.expandToMatch).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('setCollapseDepth', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.setCollapseDepth(2)
    expect(state.collapseDepth).toBe(2)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('setCollapseDepth to null', () => {
    const state = new State()
    state.setCollapseDepth(2)
    state.setCollapseDepth(null)
    expect(state.collapseDepth).toBe(null)
  })

  it('setFirstMatchPath', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.setFirstMatchPath(['users', 0, 'name'])
    expect(state.firstMatchPath).toEqual(['users', 0, 'name'])
    expect(listener).toHaveBeenCalledOnce()
  })

  it('setFirstMatchPath to null', () => {
    const state = new State()
    state.setFirstMatchPath(['a'])
    state.setFirstMatchPath(null)
    expect(state.firstMatchPath).toBe(null)
  })

  it('setExpandToPath', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.setExpandToPath(['data', 'items', 0])
    expect(state.expandToPath).toEqual(['data', 'items', 0])
    expect(listener).toHaveBeenCalledOnce()
  })

  it('setShowNullValues', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.setShowNullValues(true)
    expect(state.showNullValues).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
  })
})

// ── applySearchResults ─────────────────────────────────────

describe('applySearchResults', () => {
  it('sets firstMatchPath and resets expandToMatch', () => {
    const state = new State()
    state.setExpandToMatch(true)
    state.applySearchResults([], ['users', 'name'])
    expect(state.firstMatchPath).toEqual(['users', 'name'])
    expect(state.expandToMatch).toBe(false)
  })

  it('notifies listeners', () => {
    const state = new State()
    const listener = vi.fn()
    state.subscribe(listener)
    state.applySearchResults([], null)
    expect(listener).toHaveBeenCalledOnce()
  })
})
