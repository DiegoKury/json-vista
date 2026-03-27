import { describe, it, expect } from 'vitest'
import { createScalarDisplay } from '../src/components/tree/scalar-display'

describe('createScalarDisplay', () => {
  // ── Element type ───────────────────────────────────────────

  it('returns a span element', () => {
    const el = createScalarDisplay('test', false, false)
    expect(el.tagName).toBe('SPAN')
  })

  // ── CSS classes by type ────────────────────────────────────

  it('applies scalar-string class for strings', () => {
    const el = createScalarDisplay('hello', false, false)
    expect(el.className).toBe('scalar-string')
  })

  it('applies scalar-number class for numbers', () => {
    const el = createScalarDisplay(42, false, false)
    expect(el.className).toBe('scalar-number')
  })

  it('applies scalar-boolean class for booleans', () => {
    const el = createScalarDisplay(true, false, false)
    expect(el.className).toBe('scalar-boolean')
  })

  it('applies scalar-object class for null', () => {
    const el = createScalarDisplay(null, false, false)
    expect(el.className).toBe('scalar-object')
  })

  // ── Text content ───────────────────────────────────────────

  it('renders strings with quotes (JSON.stringify)', () => {
    const el = createScalarDisplay('hello', false, false)
    expect(el.textContent).toBe('"hello"')
  })

  it('renders numbers', () => {
    const el = createScalarDisplay(42, false, false)
    expect(el.textContent).toBe('42')
  })

  it('renders booleans', () => {
    expect(createScalarDisplay(true, false, false).textContent).toBe('true')
    expect(createScalarDisplay(false, false, false).textContent).toBe('false')
  })

  it('renders null', () => {
    const el = createScalarDisplay(null, false, false)
    expect(el.textContent).toBe('null')
  })

  it('renders empty string', () => {
    const el = createScalarDisplay('', false, false)
    expect(el.textContent).toBe('""')
  })

  it('renders strings with special characters', () => {
    const el = createScalarDisplay('line\nnewline', false, false)
    expect(el.textContent).toBe('"line\\nnewline"')
  })

  it('renders zero', () => {
    const el = createScalarDisplay(0, false, false)
    expect(el.textContent).toBe('0')
  })

  it('renders negative numbers', () => {
    const el = createScalarDisplay(-3.14, false, false)
    expect(el.textContent).toBe('-3.14')
  })

  // ── Match highlighting ─────────────────────────────────────

  it('adds highlight-match class when matched and filtered', () => {
    const el = createScalarDisplay('test', true, true)
    expect(el.className).toBe('scalar-string highlight-match')
  })

  it('does not add highlight-match when matched but not filtered', () => {
    const el = createScalarDisplay('test', true, false)
    expect(el.className).toBe('scalar-string')
  })

  it('does not add highlight-match when not matched', () => {
    const el = createScalarDisplay('test', false, true)
    expect(el.className).toBe('scalar-string')
  })

  it('highlight works with all types', () => {
    expect(createScalarDisplay(42, true, true).className).toBe('scalar-number highlight-match')
    expect(createScalarDisplay(true, true, true).className).toBe('scalar-boolean highlight-match')
    expect(createScalarDisplay(null, true, true).className).toBe('scalar-object highlight-match')
  })
})
