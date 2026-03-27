import { describe, it, expect, beforeEach } from 'vitest'
import { TreeNode } from '../src/components/tree/tree-node'
import { State } from '../src/state'
import type { JsonValue, Match } from '../src/types'

function createTreeNode(
  data: JsonValue,
  overrides: Partial<{
    name: string | number
    depth: number
    matches: Match[]
    isFiltered: boolean
    path: (string | number)[]
    expandAll: boolean
    state: State
  }> = {}
): { node: TreeNode; tbody: HTMLTableSectionElement; state: State } {
  const state = overrides.state ?? new State()
  const table = document.createElement('table')
  const tbody = document.createElement('tbody')
  table.appendChild(tbody)
  document.body.appendChild(table)

  const node = new TreeNode({
    originalData: data,
    data,
    name: overrides.name ?? 'root',
    matches: overrides.matches ?? [],
    depth: overrides.depth ?? 0,
    path: overrides.path ?? [],
    getOriginalData: (path) => {
      return path.reduce<JsonValue>((d, key) => {
        if (d === null || typeof d !== 'object') return null
        return (d as Record<string, JsonValue>)[key as string] ?? (d as JsonValue[])[key as number] ?? null
      }, data)
    },
    isFiltered: overrides.isFiltered ?? false,
    state,
    root: document.body,
  })

  node.appendTo(tbody)
  return { node, tbody, state }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  document.body.innerHTML = ''
})

// ── Basic rendering ────────────────────────────────────────

describe('basic rendering', () => {
  it('renders a table row', () => {
    const { node } = createTreeNode({ a: 1 })
    expect(node.element.tagName).toBe('TR')
  })

  it('renders key cell with name', () => {
    const { node } = createTreeNode({ a: 1 }, { name: 'myData' })
    const keyCell = node.element.querySelector('.node-key')
    expect(keyCell?.textContent).toContain('myData:')
  })

  it('renders actions cell', () => {
    const { node } = createTreeNode({ a: 1 })
    const actions = node.element.querySelector('.node-actions')
    expect(actions).not.toBeNull()
  })

  it('renders value cell', () => {
    const { node } = createTreeNode({ a: 1 })
    const value = node.element.querySelector('.node-value')
    expect(value).not.toBeNull()
  })

  it('renders scalar values directly', () => {
    const { node } = createTreeNode('hello' as JsonValue, { name: 'field', depth: 1, path: ['field'] })
    const value = node.element.querySelector('.node-value span')
    expect(value?.textContent).toBe('"hello"')
  })

  it('renders number values', () => {
    const { node } = createTreeNode(42 as JsonValue, { name: 'count', depth: 1, path: ['count'] })
    const value = node.element.querySelector('.node-value span')
    expect(value?.textContent).toBe('42')
  })

  it('renders boolean values', () => {
    const { node } = createTreeNode(true as JsonValue, { name: 'active', depth: 1, path: ['active'] })
    const value = node.element.querySelector('.node-value span')
    expect(value?.textContent).toBe('true')
  })

  it('renders null values', () => {
    const { node } = createTreeNode(null, { name: 'empty', depth: 1, path: ['empty'] })
    const value = node.element.querySelector('.node-value span')
    expect(value?.textContent).toBe('null')
  })

  it('renders object toggle for objects (expanded at root)', () => {
    const { node } = createTreeNode({ a: 1 })
    const toggle = node.element.querySelector('.node-toggle')
    expect(toggle).not.toBeNull()
    // Root auto-expands, so shows expanded state
    expect(toggle?.innerHTML).toContain('<em>object</em>')
  })

  it('renders collapsed object toggle at non-root depth', () => {
    const { tbody } = createTreeNode({ nested: { a: 1 } })
    const rows = tbody.querySelectorAll('tr')
    const nestedToggle = rows[1].querySelector('.node-toggle')
    expect(nestedToggle?.innerHTML).toContain('{...}')
  })

  it('renders array toggle for arrays (expanded at root)', () => {
    const { node } = createTreeNode([1, 2, 3])
    const toggle = node.element.querySelector('.node-toggle')
    expect(toggle).not.toBeNull()
    expect(toggle?.innerHTML).toContain('<em>array</em>')
  })

  it('renders collapsed array toggle at non-root depth', () => {
    const { tbody } = createTreeNode({ items: [1, 2] })
    const rows = tbody.querySelectorAll('tr')
    const arrToggle = rows[1].querySelector('.node-toggle')
    expect(arrToggle?.innerHTML).toContain('[...]')
  })

  it('renders empty object as {} at non-root depth', () => {
    const { tbody } = createTreeNode({ empty: {} })
    const rows = tbody.querySelectorAll('tr')
    const toggle = rows[1].querySelector('.node-toggle')
    expect(toggle?.textContent).toBe('{}')
  })

  it('renders empty array as [] at non-root depth', () => {
    const { tbody } = createTreeNode({ empty: [] })
    const rows = tbody.querySelectorAll('tr')
    const toggle = rows[1].querySelector('.node-toggle')
    expect(toggle?.textContent).toBe('[]')
  })
})

// ── Expand / collapse ──────────────────────────────────────

describe('expand / collapse', () => {
  it('root node auto-expands (depth 0)', () => {
    const { tbody } = createTreeNode({ a: 1, b: 2 })
    // Root + 2 children = 3 rows
    const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(
      r => r.style.display !== 'none'
    )
    expect(visibleRows.length).toBe(3)
  })

  it('non-root nodes start collapsed', () => {
    const { tbody } = createTreeNode({ nested: { a: 1, b: 2 } })
    // Root expanded → shows "nested" row, but "nested" is collapsed
    // So "a" and "b" are not visible
    const allRows = tbody.querySelectorAll('tr')
    expect(allRows.length).toBeGreaterThanOrEqual(2) // root + nested at minimum
  })

  it('clicking toggle expands a node', () => {
    const { tbody } = createTreeNode({ nested: { a: 1 } })
    // Find the nested node's toggle
    const rows = tbody.querySelectorAll('tr')
    const nestedRow = rows[1]
    const toggle = nestedRow.querySelector('.node-toggle') as HTMLElement
    toggle.click()

    // After expanding, child "a" should be visible
    const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(
      r => r.style.display !== 'none'
    )
    expect(visibleRows.length).toBe(3) // root, nested, a
  })

  it('clicking toggle again collapses the node', () => {
    const { tbody } = createTreeNode({ nested: { a: 1 } })
    const rows = tbody.querySelectorAll('tr')
    const nestedRow = rows[1]

    // Expand
    const toggle1 = nestedRow.querySelector('.node-toggle') as HTMLElement
    toggle1.click()

    // Collapse — toggle re-renders so re-query
    const toggle2 = nestedRow.querySelector('.node-toggle') as HTMLElement
    toggle2.click()

    // Should only show root + nested (collapsed)
    const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(
      r => r.style.display !== 'none'
    )
    expect(visibleRows.length).toBe(2)
  })

  it('key cell click also toggles', () => {
    const { tbody } = createTreeNode({ nested: { a: 1 } })
    const rows = tbody.querySelectorAll('tr')
    const nestedRow = rows[1]
    const keyCell = nestedRow.querySelector('.node-key') as HTMLElement
    keyCell.click()

    const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(
      r => r.style.display !== 'none'
    )
    expect(visibleRows.length).toBe(3)
  })
})

// ── State-driven behavior ──────────────────────────────────

describe('state-driven behavior', () => {
  it('collapseDepth + expandToPath selectively expands a path', () => {
    const data = { a: { x: 1 }, b: { y: 2 } }
    const state = new State()
    const { tbody } = createTreeNode(data, { state })

    // Expand both "a" and "b" by clicking their toggles
    const rows = tbody.querySelectorAll('tr')
    for (const row of Array.from(rows)) {
      const toggle = row.querySelector('.node-toggle.clickable') as HTMLElement
      if (toggle) toggle.click()
    }

    // Collapse everything then expand only path to b.y
    state.setCollapseDepth(0)
    state.setCollapseDepth(null)
    state.setExpandToPath(['b', 'y'])

    // "b" should be expanded (its child "y" visible), "a" should stay collapsed
    const aRow = Array.from(tbody.querySelectorAll('tr')).find(r =>
      r.querySelector('.node-key span')?.textContent === 'a:'
    )
    const bRow = Array.from(tbody.querySelectorAll('tr')).find(r =>
      r.querySelector('.node-key span')?.textContent === 'b:'
    )

    // Both a and b rows are visible, but b's toggle shows expanded content
    expect(aRow).not.toBeNull()
    expect(bRow).not.toBeNull()
    expect(bRow?.querySelector('.node-toggle')?.innerHTML).toContain('<em>object</em>')
  })

  it('null values hidden by default', () => {
    const { tbody } = createTreeNode({ visible: 'yes', hidden: null })
    const rows = Array.from(tbody.querySelectorAll('tr'))
    const nullRow = rows.find(r => r.querySelector('.scalar-object'))
    expect(nullRow?.style.display).toBe('none')
  })

  it('null values shown when showNullValues is true', () => {
    const state = new State()
    const { tbody } = createTreeNode({ visible: 'yes', shown: null }, { state })
    state.setShowNullValues(true)

    const rows = Array.from(tbody.querySelectorAll('tr'))
    const nullRow = rows.find(r => {
      const span = r.querySelector('.node-value span')
      return span?.textContent === 'null'
    })
    expect(nullRow?.style.display).not.toBe('none')
  })

  it('expandToPath expands nodes along the path', () => {
    const data = { users: [{ name: 'Alice' }] }
    const state = new State()
    const { tbody } = createTreeNode(data, { state })

    state.setExpandToPath(['users', 0, 'name'])

    // All nodes along the path should be expanded
    const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(
      r => r.style.display !== 'none'
    )
    expect(visibleRows.length).toBeGreaterThanOrEqual(3)
  })
})

// ── Hidden paths ───────────────────────────────────────────

describe('hidden paths', () => {
  it('hides rows matching hidden path patterns', () => {
    const state = new State()
    state.setHiddenPaths([['secret']])
    const { tbody } = createTreeNode({ secret: 'hidden', visible: 'shown' }, { state })

    const rows = Array.from(tbody.querySelectorAll('tr'))
    const secretRow = rows.find(r => r.querySelector('.node-key span')?.textContent === 'secret:')
    expect(secretRow?.style.display).toBe('none')
  })

  it('shows hidden rows in preview mode', () => {
    const state = new State()
    state.setHiddenPaths([['secret']])
    const { tbody } = createTreeNode({ secret: 'hidden', visible: 'shown' }, { state })

    state.toggleHideMode() // enables previewHidden

    const rows = Array.from(tbody.querySelectorAll('tr'))
    const secretRow = rows.find(r => r.querySelector('.node-key span')?.textContent === 'secret:')
    expect(secretRow?.style.display).not.toBe('none')
  })
})

// ── Actions cell ───────────────────────────────────────────

describe('actions cell', () => {
  it('renders checkbox in non-pattern hide mode', () => {
    const state = new State()
    state.toggleHideMode() // switch to checkbox mode
    const { node } = createTreeNode({ a: 1 }, { state })
    const checkbox = node.element.querySelector('.node-actions input[type="checkbox"]')
    expect(checkbox).not.toBeNull()
  })

  it('renders pattern hide button in pattern mode', () => {
    const { node } = createTreeNode({ a: 1 }, { depth: 1, path: ['a'] })
    const actions = node.element.querySelector('.node-actions')
    const btn = actions?.querySelector('.btn-icon')
    expect(btn).not.toBeNull()
  })
})

// ── Match highlighting ─────────────────────────────────────

describe('match highlighting', () => {
  it('sets match ID on matched row', () => {
    const matches: Match[] = [
      { path: ['name'], key: 'name', value: 'Alice', matchType: 'both', id: 'match-1' },
    ]
    const data = { name: 'Alice' }
    createTreeNode(data, { matches, isFiltered: true })

    const matchedEl = document.getElementById('match-1')
    expect(matchedEl).not.toBeNull()
  })

  it('applies highlight-key class to matched key', () => {
    const matches: Match[] = [
      { path: ['name'], key: 'name', value: 'Alice', matchType: 'both', id: 'match-1' },
    ]
    const state = new State()
    const { tbody } = createTreeNode({ name: 'Alice' }, { matches, isFiltered: true, state })

    const highlightedKey = tbody.querySelector('.highlight-key')
    expect(highlightedKey).not.toBeNull()
    expect(highlightedKey?.textContent).toContain('name:')
  })

  it('applies highlight-match class to matched value', () => {
    const matches: Match[] = [
      { path: ['name'], key: 'name', value: 'Alice', matchType: 'value', id: 'match-1' },
    ]
    const { tbody } = createTreeNode({ name: 'Alice' }, { matches, isFiltered: true })

    const highlighted = tbody.querySelector('.highlight-match')
    expect(highlighted).not.toBeNull()
  })
})

// ── Chunked rendering ──────────────────────────────────────

describe('chunked rendering', () => {
  it('renders first 100 items by default for large arrays', () => {
    const largeArray: JsonValue[] = Array.from({ length: 250 }, (_, i) => `item-${i}`)
    const { tbody } = createTreeNode(largeArray)

    // Root + 100 children + 1 "show more" row = 102
    const allRows = tbody.querySelectorAll('tr')
    expect(allRows.length).toBe(102)
  })

  it('shows "Show more" button for large collections', () => {
    const largeArray: JsonValue[] = Array.from({ length: 200 }, (_, i) => `item-${i}`)
    const { tbody } = createTreeNode(largeArray)

    const showMoreBtn = tbody.querySelector('.btn-secondary') as HTMLButtonElement
    expect(showMoreBtn).not.toBeNull()
    expect(showMoreBtn.textContent).toContain('remaining')
    expect(showMoreBtn.textContent).toContain('100')
  })

  it('clicking "Show more" renders the next chunk', () => {
    const largeArray: JsonValue[] = Array.from({ length: 250 }, (_, i) => `item-${i}`)
    const { tbody } = createTreeNode(largeArray)

    const showMoreBtn = tbody.querySelector('.btn-secondary') as HTMLButtonElement
    showMoreBtn.click()

    // Now should have 200 children + root + show more = 202
    const allRows = tbody.querySelectorAll('tr')
    expect(allRows.length).toBe(202)
  })

  it('"Show more" disappears when all items are rendered', () => {
    const largeArray: JsonValue[] = Array.from({ length: 150 }, (_, i) => `item-${i}`)
    const { tbody } = createTreeNode(largeArray)

    const showMoreBtn = tbody.querySelector('.btn-secondary') as HTMLButtonElement
    showMoreBtn.click()

    // All 150 items rendered, no more "show more" button
    const allRows = tbody.querySelectorAll('tr')
    expect(allRows.length).toBe(151) // root + 150 children
    expect(tbody.querySelector('.btn-secondary')).toBeNull()
  })

  it('does not chunk small collections', () => {
    const smallArray: JsonValue[] = Array.from({ length: 50 }, (_, i) => `item-${i}`)
    const { tbody } = createTreeNode(smallArray)

    // No "show more" button
    expect(tbody.querySelector('.btn-secondary')).toBeNull()
    const allRows = tbody.querySelectorAll('tr')
    expect(allRows.length).toBe(51) // root + 50
  })

  it('renders chunks for large objects too', () => {
    const bigObj: Record<string, JsonValue> = {}
    for (let i = 0; i < 150; i++) bigObj[`key${String(i).padStart(3, '0')}`] = i
    const { tbody } = createTreeNode(bigObj)

    const showMoreBtn = tbody.querySelector('.btn-secondary') as HTMLButtonElement
    expect(showMoreBtn).not.toBeNull()
    expect(showMoreBtn.textContent).toContain('50 remaining')
  })
})

// ── Rows getter ────────────────────────────────────────────

describe('rows', () => {
  it('returns all rows including children', () => {
    const { node } = createTreeNode({ a: 1, b: 2 })
    expect(node.rows.length).toBe(3) // root + 2 children
  })

  it('includes show-more row in rows', () => {
    const largeArray: JsonValue[] = Array.from({ length: 150 }, (_, i) => `item-${i}`)
    const { node } = createTreeNode(largeArray)
    // root + 100 children + show more = 102
    expect(node.rows.length).toBe(102)
  })
})

// ── Cleanup ────────────────────────────────────────────────

describe('destroy', () => {
  it('unsubscribes from state', () => {
    const state = new State()
    const { node } = createTreeNode({ a: 1 }, { state })
    node.destroy()

    // After destroy, state changes should not cause errors
    expect(() => state.setShowNullValues(true)).not.toThrow()
  })
})

// ── Edge cases ─────────────────────────────────────────────

describe('edge cases', () => {
  it('handles deeply nested objects', () => {
    let data: JsonValue = 'leaf'
    for (let i = 0; i < 10; i++) data = { [`level${i}`]: data }
    expect(() => createTreeNode(data)).not.toThrow()
  })

  it('handles mixed-type arrays', () => {
    const data: JsonValue = ['string', 42, true, null, { key: 'val' }, [1, 2]]
    const { tbody } = createTreeNode(data)
    const rows = tbody.querySelectorAll('tr')
    expect(rows.length).toBe(7) // root + 6 items
  })

  it('handles empty nested objects', () => {
    const data = { empty: {}, alsoEmpty: [] }
    const { tbody } = createTreeNode(data)
    const rows = tbody.querySelectorAll('tr')
    expect(rows.length).toBe(3)
  })

  it('handles unicode keys', () => {
    const data = { '名前': 'テスト', 'émoji': '🎉' }
    const { tbody } = createTreeNode(data)
    const keys = Array.from(tbody.querySelectorAll('.node-key span')).map(s => s.textContent)
    expect(keys).toContain('名前:')
    expect(keys).toContain('émoji:')
  })

  it('handles very long string values', () => {
    const longStr = 'x'.repeat(10000)
    const { tbody } = createTreeNode({ text: longStr })
    const valueSpan = tbody.querySelector('.scalar-string')
    expect(valueSpan?.textContent).toContain(longStr)
  })
})
