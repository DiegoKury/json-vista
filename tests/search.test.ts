import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Search } from '../src/components/search'
import type { FilterResult } from '../src/components/search'

describe('Search', () => {
  let onFilter: ReturnType<typeof vi.fn<(result: FilterResult) => void>>
  let onClear: ReturnType<typeof vi.fn<() => void>>
  let search: Search

  beforeEach(() => {
    onFilter = vi.fn<(result: FilterResult) => void>()
    onClear = vi.fn<() => void>()
    search = new Search(onFilter, onClear)
    search.setData(
      { name: 'Alice', age: 30, city: 'Wonderland' },
      { name: 'Alice', age: 30, city: 'Wonderland' }
    )
  })

  // ── Element creation ───────────────────────────────────────

  it('creates a search panel element', () => {
    expect(search.element.tagName).toBe('DIV')
    expect(search.element.className).toBe('search-panel')
  })

  it('renders an input for value search', () => {
    const input = search.element.querySelector('input')
    expect(input).not.toBeNull()
    expect(input?.placeholder).toBe('Search values…')
  })

  it('renders a search button', () => {
    const btn = search.element.querySelector('.btn-search')
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toBe('Search')
  })

  it('search button is disabled initially (no search term)', () => {
    const btn = search.element.querySelector('.btn-search') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  // ── Property type selector ─────────────────────────────────

  it('renders property type dropdown with string/number', () => {
    const select = search.element.querySelector('select')
    expect(select).not.toBeNull()
    const options = select!.querySelectorAll('option')
    const values = Array.from(options).map(o => o.value)
    expect(values).toContain('string')
    expect(values).toContain('number')
  })

  // ── Search type selector ───────────────────────────────────

  it('shows search type selector for string mode', () => {
    const selects = search.element.querySelectorAll('select')
    const searchTypeSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.value === 'partial')
    )
    expect(searchTypeSelect).not.toBeNull()
  })

  // ── Case toggle ────────────────────────────────────────────

  it('renders case toggle button', () => {
    const caseBtn = search.element.querySelector('.btn-case-toggle')
    expect(caseBtn).not.toBeNull()
    expect(caseBtn?.textContent).toBe('Aa')
  })

  it('case toggle starts as active (case-insensitive)', () => {
    const caseBtn = search.element.querySelector('.btn-case-toggle')
    expect(caseBtn?.classList.contains('active')).toBe(true)
  })

  // ── Key search chip ────────────────────────────────────────

  it('renders Key chip button', () => {
    const chips = search.element.querySelectorAll('.btn-chip')
    const keyChip = Array.from(chips).find(c => c.textContent === 'Key')
    expect(keyChip).not.toBeNull()
  })

  it('shows key row when Key chip is active (default)', () => {
    const keyRow = search.element.querySelector('.search-row--sub')
    expect(keyRow).not.toBeNull()
    const keyLabel = keyRow?.querySelector('.search-key-label')
    expect(keyLabel?.textContent).toBe('key')
  })

  it('hides key row when Key chip is toggled off', () => {
    const chips = search.element.querySelectorAll('.btn-chip')
    const keyChip = Array.from(chips).find(c => c.textContent === 'Key') as HTMLElement
    keyChip.click()
    const keyRow = search.element.querySelector('.search-row--sub')
    expect(keyRow).toBeNull()
  })

  // ── 2nd search chip ────────────────────────────────────────

  it('renders 2nd chip button', () => {
    const chips = search.element.querySelectorAll('.btn-chip')
    const secondChip = Array.from(chips).find(c => c.textContent === '2nd')
    expect(secondChip).not.toBeNull()
  })

  it('does not show secondary search by default', () => {
    const divider = search.element.querySelector('.search-divider')
    expect(divider).toBeNull()
  })

  it('shows secondary search panel when 2nd chip is clicked', () => {
    const chips = search.element.querySelectorAll('.btn-chip')
    const secondChip = Array.from(chips).find(c => c.textContent === '2nd') as HTMLElement
    secondChip.click()
    const divider = search.element.querySelector('.search-divider')
    expect(divider).not.toBeNull()
    expect(divider?.textContent).toBe('and also')
  })

  it('secondary panel has its own value input', () => {
    const chips = search.element.querySelectorAll('.btn-chip')
    const secondChip = Array.from(chips).find(c => c.textContent === '2nd') as HTMLElement
    secondChip.click()
    const inputs = search.element.querySelectorAll('input')
    const secondaryInput = Array.from(inputs).find(i => i.placeholder === 'Secondary values…')
    expect(secondaryInput).not.toBeNull()
  })

  // ── Triggering search ──────────────────────────────────────

  it('calls onFilter when search button is clicked with a term', () => {
    const input = search.element.querySelector('input') as HTMLInputElement
    input.value = 'Alice'
    input.dispatchEvent(new Event('input'))

    const btn = search.element.querySelector('.btn-search') as HTMLButtonElement
    btn.click()

    expect(onFilter).toHaveBeenCalledOnce()
    const result: FilterResult = onFilter.mock.calls[0][0]
    expect(result.matchCount).toBe(1)
    expect(result.matches.length).toBe(1)
  })

  it('calls onFilter on Enter key in search input', () => {
    const input = search.element.querySelector('input') as HTMLInputElement
    input.value = 'Alice'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(onFilter).toHaveBeenCalledOnce()
  })

  it('does not search with empty term', () => {
    const btn = search.element.querySelector('.btn-search') as HTMLButtonElement
    btn.click()
    expect(onFilter).not.toHaveBeenCalled()
  })

  it('does not search on Enter with empty term', () => {
    const input = search.element.querySelector('input') as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onFilter).not.toHaveBeenCalled()
  })

  it('enables search button when term is entered', () => {
    const input = search.element.querySelector('input') as HTMLInputElement
    const btn = search.element.querySelector('.btn-search') as HTMLButtonElement
    expect(btn.disabled).toBe(true)

    input.value = 'test'
    input.dispatchEvent(new Event('input'))
    expect(btn.disabled).toBe(false)
  })

  it('enables search button when key term is entered', () => {
    const keyInput = search.element.querySelector('.search-row--sub input') as HTMLInputElement
    const btn = search.element.querySelector('.btn-search') as HTMLButtonElement

    keyInput.value = 'name'
    keyInput.dispatchEvent(new Event('input'))
    expect(btn.disabled).toBe(false)
  })

  // ── Clear ──────────────────────────────────────────────────

  it('clear() calls onClear callback', () => {
    search.clear()
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('clear() resets state and re-renders', () => {
    // Enable secondary search
    const chips = search.element.querySelectorAll('.btn-chip')
    const secondChip = Array.from(chips).find(c => c.textContent === '2nd') as HTMLElement
    secondChip.click()
    expect(search.element.querySelector('.search-divider')).not.toBeNull()

    search.clear()
    // Secondary should be hidden after clear
    expect(search.element.querySelector('.search-divider')).toBeNull()
  })

  // ── destroy ────────────────────────────────────────────────

  it('removes element from DOM', () => {
    const container = document.createElement('div')
    container.appendChild(search.element)
    expect(container.children.length).toBe(1)
    search.destroy()
    expect(container.children.length).toBe(0)
  })

  // ── Number mode UI ─────────────────────────────────────────

  it('shows numeric condition dropdown when property type is number', () => {
    const select = search.element.querySelector('select') as HTMLSelectElement
    select.value = 'number'
    select.dispatchEvent(new Event('change'))

    const selects = search.element.querySelectorAll('select')
    const conditionSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.value === 'greater than')
    )
    expect(conditionSelect).not.toBeNull()
  })

  it('hides search type and case toggle in number mode on the value row', () => {
    const select = search.element.querySelector('select') as HTMLSelectElement
    select.value = 'number'
    select.dispatchEvent(new Event('change'))

    // Case toggle should not be in the primary value row
    const primaryRow = search.element.querySelector('.search-row:not(.search-row--sub)') as HTMLElement
    expect(primaryRow.querySelector('.btn-case-toggle')).toBeNull()

    // Numeric condition dropdown should appear instead
    const selects = primaryRow.querySelectorAll('select')
    const conditionSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.value === 'greater than')
    )
    expect(conditionSelect).not.toBeNull()
  })

  // ── setData ────────────────────────────────────────────────

  it('setData updates internal data for filtering', () => {
    search.setData({ newKey: 'newValue' }, { newKey: 'newValue' })
    const input = search.element.querySelector('input') as HTMLInputElement
    input.value = 'newValue'
    input.dispatchEvent(new Event('input'))

    const btn = search.element.querySelector('.btn-search') as HTMLButtonElement
    btn.click()

    expect(onFilter).toHaveBeenCalledOnce()
    const result: FilterResult = onFilter.mock.calls[0][0]
    expect(result.matchCount).toBe(1)
  })
})
