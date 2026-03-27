import { describe, it, expect } from 'vitest'
import { createNodeToggle } from '../src/components/tree/node-toggle'

describe('createNodeToggle', () => {
  // ── Element type ───────────────────────────────────────────

  it('returns a div element', () => {
    const el = createNodeToggle({ a: 1 }, true, '', true)
    expect(el.tagName).toBe('DIV')
  })

  // ── Empty collections ──────────────────────────────────────

  it('shows {} for empty collapsed object', () => {
    const el = createNodeToggle({}, true, '', true)
    expect(el.textContent).toBe('{}')
    expect(el.className).toBe('node-toggle')
  })

  it('shows [] for empty collapsed array', () => {
    const el = createNodeToggle([], true, '', false)
    expect(el.textContent).toBe('[]')
    expect(el.className).toBe('node-toggle')
  })

  it('does not have clickable class for empty collections', () => {
    expect(createNodeToggle({}, true, '', true).classList.contains('clickable')).toBe(false)
    expect(createNodeToggle([], true, '', false).classList.contains('clickable')).toBe(false)
  })

  // ── Collapsed non-empty ────────────────────────────────────

  it('shows chevron right + {...} for collapsed object', () => {
    const el = createNodeToggle({ a: 1 }, true, '', true)
    expect(el.className).toBe('node-toggle clickable')
    expect(el.innerHTML).toContain('{...}')
    expect(el.innerHTML).toContain('svg')
  })

  it('shows chevron right + [...] for collapsed array', () => {
    const el = createNodeToggle([1, 2], true, '', false)
    expect(el.className).toBe('node-toggle clickable')
    expect(el.innerHTML).toContain('[...]')
  })

  // ── Expanded non-empty ─────────────────────────────────────

  it('shows chevron down + "object" for expanded object', () => {
    const el = createNodeToggle({ a: 1 }, false, '', true)
    expect(el.className).toBe('node-toggle clickable')
    expect(el.innerHTML).toContain('<em>object</em>')
  })

  it('shows chevron down + "array" for expanded array', () => {
    const el = createNodeToggle([1], false, '', false)
    expect(el.innerHTML).toContain('<em>array</em>')
  })

  // ── Match class ────────────────────────────────────────────

  it('applies match class to collapsed span', () => {
    const el = createNodeToggle({ a: 1 }, true, 'highlight-match', true)
    const span = el.querySelector('span')
    expect(span?.className).toBe('highlight-match')
  })

  it('applies match class to expanded span', () => {
    const el = createNodeToggle({ a: 1 }, false, 'highlight-match', true)
    const span = el.querySelector('span')
    expect(span?.className).toBe('highlight-match')
  })

  it('applies empty match class without extra space', () => {
    const el = createNodeToggle({ a: 1 }, true, '', true)
    const span = el.querySelector('span')
    expect(span?.className).toBe('')
  })

  // ── Edge cases ─────────────────────────────────────────────

  it('handles array with null values', () => {
    const el = createNodeToggle([null], true, '', false)
    expect(el.innerHTML).toContain('[...]')
  })

  it('handles object with many keys', () => {
    const bigObj: Record<string, number> = {}
    for (let i = 0; i < 100; i++) bigObj[`key${i}`] = i
    const el = createNodeToggle(bigObj, true, '', true)
    expect(el.innerHTML).toContain('{...}')
    expect(el.classList.contains('clickable')).toBe(true)
  })
})
