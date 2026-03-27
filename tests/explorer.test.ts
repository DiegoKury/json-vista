import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { JsonValue, Source } from '../src/types'

// We need to handle the custom element registration (can only happen once)
// and the CSS ?raw import. We'll import dynamically after setup.

// Mock the CSS raw import
vi.mock('../styles/index.css?raw', () => ({ default: '/* mocked styles */' }))

let JsonVista: typeof import('../src/explorer').JsonVista

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  document.body.innerHTML = ''

  // Dynamic import so the mock is applied
  const mod = await import('../src/explorer')
  JsonVista = mod.JsonVista
})

function createElement(data?: JsonValue, source?: Source): HTMLElement {
  const el = document.createElement('json-vista') as InstanceType<typeof JsonVista>
  if (data !== undefined) el.data = data
  if (source) el.source = source
  document.body.appendChild(el)
  return el
}

// ── Custom element registration ────────────────────────────

describe('custom element', () => {
  it('is registered as json-vista', () => {
    expect(customElements.get('json-vista')).toBeDefined()
  })

  it('creates an instance with shadow DOM', () => {
    const el = createElement({ test: 1 })
    expect(el.shadowRoot).not.toBeNull()
  })
})

// ── Data property ──────────────────────────────────────────

describe('data property', () => {
  it('renders tree when data is set', () => {
    const el = createElement({ name: 'Alice' })
    const tree = el.shadowRoot!.querySelector('.json-tree')
    expect(tree).not.toBeNull()
  })

  it('getter returns the set data', () => {
    const data = { name: 'Alice', age: 30 }
    const el = createElement(data) as InstanceType<typeof JsonVista>
    expect(el.data).toBe(data)
  })

  it('re-renders when data changes', () => {
    const el = createElement({ old: 'data' }) as InstanceType<typeof JsonVista>
    el.data = { new: 'data' }
    const rows = el.shadowRoot!.querySelectorAll('tr')
    const keys = Array.from(rows).map(r => r.querySelector('.node-key span')?.textContent)
    expect(keys).toContain('new:')
    expect(keys).not.toContain('old:')
  })

  it('does not render when data is null', () => {
    const el = createElement(null)
    const tree = el.shadowRoot!.querySelector('.json-tree')
    expect(tree).toBeNull()
  })

  it('renders primitives', () => {
    const el = createElement('hello' as JsonValue)
    const rows = el.shadowRoot!.querySelectorAll('tr')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('renders arrays', () => {
    const el = createElement([1, 2, 3])
    const rows = el.shadowRoot!.querySelectorAll('tr')
    expect(rows.length).toBeGreaterThanOrEqual(4) // root + 3 items
  })
})

// ── Circular reference protection ──────────────────────────

describe('circular reference protection', () => {
  it('throws on circular reference in data', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(() => createElement(obj as JsonValue)).toThrow('circular reference')
  })

  it('throws on deeply nested circular reference', () => {
    const inner: Record<string, unknown> = { value: 42 }
    const outer = { level1: { level2: inner } }
    inner.back = outer
    expect(() => createElement(outer as JsonValue)).toThrow('circular reference')
  })

  it('accepts non-circular data', () => {
    expect(() => createElement({ a: { b: { c: 1 } } })).not.toThrow()
  })
})

// ── Source property ────────────────────────────────────────

describe('source property', () => {
  it('renders source name', () => {
    const el = createElement({ a: 1 }, { name: 'My API' })
    const header = el.shadowRoot!.querySelector('.source-header')
    expect(header?.textContent).toContain('My API')
  })

  it('renders source URL as link', () => {
    const el = createElement({ a: 1 }, { url: 'https://api.example.com' })
    const link = el.shadowRoot!.querySelector('.source-header a') as HTMLAnchorElement
    expect(link).not.toBeNull()
    expect(link.href).toBe('https://api.example.com/')
    expect(link.target).toBe('_blank')
    expect(link.rel).toBe('noopener noreferrer')
  })

  it('renders source name with URL', () => {
    const el = createElement({ a: 1 }, { name: 'API', url: 'https://api.example.com' })
    const header = el.shadowRoot!.querySelector('.source-header')
    expect(header?.textContent).toContain('API')
    expect(header?.querySelector('a')).not.toBeNull()
  })

  it('does not render header when no source', () => {
    const el = createElement({ a: 1 })
    const header = el.shadowRoot!.querySelector('.source-header')
    expect(header).toBeNull()
  })

  it('getter returns the source', () => {
    const source = { name: 'Test' }
    const el = createElement({ a: 1 }, source) as InstanceType<typeof JsonVista>
    expect(el.source).toBe(source)
  })
})

// ── Search panel ───────────────────────────────────────────

describe('search panel', () => {
  it('renders search panel', () => {
    const el = createElement({ name: 'Alice' })
    const panel = el.shadowRoot!.querySelector('.search-panel')
    expect(panel).not.toBeNull()
  })

  it('search filters the tree', () => {
    const el = createElement({ name: 'Alice', city: 'Wonderland', age: 30 })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'Alice'
    input.dispatchEvent(new Event('input'))
    const searchBtn = shadow.querySelector('.btn-search') as HTMLButtonElement
    searchBtn.click()

    const matchCount = shadow.querySelector('.match-count')
    expect(matchCount?.textContent).toContain('1')
  })
})

// ── Toolbar ────────────────────────────────────────────────

describe('toolbar', () => {
  it('renders toolbar', () => {
    const el = createElement({ a: 1 })
    const toolbar = el.shadowRoot!.querySelector('.toolbar')
    expect(toolbar).not.toBeNull()
  })

  it('renders Sort A→Z button', () => {
    const el = createElement({ a: 1 })
    const btns = el.shadowRoot!.querySelectorAll('.toolbar .btn')
    const sortBtn = Array.from(btns).find(b => b.textContent?.includes('Sort'))
    expect(sortBtn).not.toBeNull()
  })

  it('renders Show nulls button', () => {
    const el = createElement({ a: 1 })
    const btns = el.shadowRoot!.querySelectorAll('.toolbar .btn')
    const nullBtn = Array.from(btns).find(b => b.textContent?.includes('null'))
    expect(nullBtn).not.toBeNull()
  })

  it('renders Hide props button', () => {
    const el = createElement({ a: 1 })
    const btns = el.shadowRoot!.querySelectorAll('.toolbar .btn')
    const hideBtn = Array.from(btns).find(b => b.textContent?.includes('Hide props'))
    expect(hideBtn).not.toBeNull()
  })

  it('Sort button sorts keys alphabetically', () => {
    const el = createElement({ zebra: 1, apple: 2, mango: 3 })
    const shadow = el.shadowRoot!
    const btns = shadow.querySelectorAll('.toolbar .btn')
    const sortBtn = Array.from(btns).find(b => b.textContent?.includes('Sort')) as HTMLButtonElement
    sortBtn.click()

    const keys = Array.from(shadow.querySelectorAll('.node-key span'))
      .map(s => s.textContent)
      .filter(t => t !== 'root:')
    expect(keys).toEqual(['apple:', 'mango:', 'zebra:'])
  })

  it('Sort button becomes disabled after sorting', () => {
    const el = createElement({ b: 1, a: 2 })
    const shadow = el.shadowRoot!
    const sortBtn = Array.from(shadow.querySelectorAll('.toolbar .btn'))
      .find(b => b.textContent?.includes('Sort')) as HTMLButtonElement
    sortBtn.click()

    const updatedBtn = Array.from(shadow.querySelectorAll('.toolbar .btn'))
      .find(b => b.textContent?.includes('Sorted')) as HTMLButtonElement
    expect(updatedBtn.disabled).toBe(true)
  })

  it('Show nulls toggle works', () => {
    const el = createElement({ visible: 'yes', empty: null })
    const shadow = el.shadowRoot!

    // Null value should be hidden initially
    const nullRow = Array.from(shadow.querySelectorAll('tr')).find(r => {
      const span = r.querySelector('.node-value span')
      return span?.textContent === 'null'
    })
    expect(nullRow?.style.display).toBe('none')

    // Click show nulls
    const nullBtn = Array.from(shadow.querySelectorAll('.toolbar .btn'))
      .find(b => b.textContent?.includes('Show null')) as HTMLButtonElement
    nullBtn.click()

    // Now null should be visible
    const nullRowAfter = Array.from(shadow.querySelectorAll('tr')).find(r => {
      const span = r.querySelector('.node-value span')
      return span?.textContent === 'null'
    })
    expect(nullRowAfter?.style.display).not.toBe('none')
  })

  // ── Filter toolbar ─────────────────────────────────────────

  it('shows match count and navigation after search', () => {
    const el = createElement({ a: 'hello', b: 'hello world' })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'hello'
    input.dispatchEvent(new Event('input'))
    const searchBtn = shadow.querySelector('.btn-search') as HTMLButtonElement
    searchBtn.click()

    expect(shadow.querySelector('.match-count')?.textContent).toContain('2 matches')
    expect(shadow.querySelector('.btn-next')).not.toBeNull()
    expect(shadow.querySelector('.btn-next')?.textContent).toContain('Jump to first')
  })

  it('shows Expand button after search', () => {
    const el = createElement({ a: 'target' })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'target'
    input.dispatchEvent(new Event('input'))
    shadow.querySelector<HTMLButtonElement>('.btn-search')!.click()

    const expandBtn = Array.from(shadow.querySelectorAll('.toolbar .btn'))
      .find(b => b.textContent?.includes('Expand'))
    expect(expandBtn).not.toBeNull()
  })

  it('shows Clear button after search', () => {
    const el = createElement({ a: 'target' })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'target'
    input.dispatchEvent(new Event('input'))
    shadow.querySelector<HTMLButtonElement>('.btn-search')!.click()

    const clearBtn = Array.from(shadow.querySelectorAll('.toolbar .btn'))
      .find(b => b.textContent?.includes('Clear'))
    expect(clearBtn).not.toBeNull()
  })

  it('Clear button restores full tree', () => {
    const el = createElement({ a: 'target', b: 'other' })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'target'
    input.dispatchEvent(new Event('input'))
    shadow.querySelector<HTMLButtonElement>('.btn-search')!.click()

    const clearBtn = Array.from(shadow.querySelectorAll('.toolbar .btn'))
      .find(b => b.textContent?.includes('Clear')) as HTMLButtonElement
    clearBtn.click()

    // Match count should be gone
    expect(shadow.querySelector('.match-count')).toBeNull()
    // Both keys should be visible
    const keys = Array.from(shadow.querySelectorAll('.node-key span'))
      .map(s => s.textContent)
      .filter(t => t !== 'root:')
    expect(keys).toContain('a:')
    expect(keys).toContain('b:')
  })
})

// ── Match navigation ───────────────────────────────────────

describe('match navigation', () => {
  it('Next button navigates through matches', () => {
    const el = createElement({
      items: [
        { name: 'match1' },
        { name: 'match2' },
      ],
    })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'match'
    input.dispatchEvent(new Event('input'))
    shadow.querySelector<HTMLButtonElement>('.btn-search')!.click()

    const nextBtn = shadow.querySelector('.btn-next') as HTMLButtonElement
    nextBtn.click()

    // Should show "1 / 2 matches"
    expect(shadow.querySelector('.match-count')?.textContent).toContain('1 / 2')
    // Button text should change from "Jump to first" to "Next"
    expect(nextBtn.textContent).toContain('Next')
  })

  it('shows breadcrumb path for current match', () => {
    const el = createElement({ users: [{ name: 'match' }] })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'match'
    input.dispatchEvent(new Event('input'))
    shadow.querySelector<HTMLButtonElement>('.btn-search')!.click()

    shadow.querySelector<HTMLButtonElement>('.btn-next')!.click()

    const breadcrumb = shadow.querySelector('.match-breadcrumb')
    expect(breadcrumb?.textContent).toContain('root')
    expect(breadcrumb?.textContent).toContain('users')
    expect(breadcrumb?.textContent).toContain('name')
  })

  it('wraps around to first match after last', () => {
    const el = createElement({ a: 'x', b: 'x' })
    const shadow = el.shadowRoot!
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'x'
    input.dispatchEvent(new Event('input'))
    shadow.querySelector<HTMLButtonElement>('.btn-search')!.click()

    const nextBtn = shadow.querySelector('.btn-next') as HTMLButtonElement
    nextBtn.click() // match 1
    nextBtn.click() // match 2
    nextBtn.click() // wraps to match 1

    expect(shadow.querySelector('.match-count')?.textContent).toContain('1 / 2')
  })
})

// ── connectedCallback ──────────────────────────────────────

describe('connectedCallback', () => {
  it('renders when connected to DOM with data', () => {
    const el = document.createElement('json-vista') as InstanceType<typeof JsonVista>
    el.data = { test: 1 }
    // Not yet connected, but data setter triggers render
    document.body.appendChild(el) // connectedCallback fires
    expect(el.shadowRoot!.querySelector('.json-tree')).not.toBeNull()
  })

  it('does not render when connected without data', () => {
    const el = document.createElement('json-vista')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('.json-tree')).toBeNull()
  })
})

// ── Reset on data change ───────────────────────────────────

describe('reset on data change', () => {
  it('clears search state when data changes', () => {
    const el = createElement({ a: 'target', b: 'other' }) as InstanceType<typeof JsonVista>
    const shadow = el.shadowRoot!

    // Perform a search
    const input = shadow.querySelector('.search-panel input') as HTMLInputElement
    input.value = 'target'
    input.dispatchEvent(new Event('input'))
    shadow.querySelector<HTMLButtonElement>('.btn-search')!.click()
    expect(shadow.querySelector('.match-count')).not.toBeNull()

    // Change data
    el.data = { c: 'new' }
    expect(shadow.querySelector('.match-count')).toBeNull()
  })
})

// ── Shadow DOM styles ──────────────────────────────────────

describe('shadow DOM', () => {
  it('has a style element', () => {
    const el = createElement({ a: 1 })
    const style = el.shadowRoot!.querySelector('style')
    expect(style).not.toBeNull()
  })

  it('has card wrapper', () => {
    const el = createElement({ a: 1 })
    const card = el.shadowRoot!.querySelector('.card')
    expect(card).not.toBeNull()
  })

  it('tree is inside tree-wrapper', () => {
    const el = createElement({ a: 1 })
    const wrapper = el.shadowRoot!.querySelector('.tree-wrapper')
    expect(wrapper).not.toBeNull()
    expect(wrapper!.querySelector('.json-tree')).not.toBeNull()
  })
})

// ── Edge cases ─────────────────────────────────────────────

describe('edge cases', () => {
  it('handles empty object', () => {
    expect(() => createElement({})).not.toThrow()
  })

  it('handles empty array', () => {
    expect(() => createElement([])).not.toThrow()
  })

  it('handles deeply nested data', () => {
    let data: JsonValue = 'deep'
    for (let i = 0; i < 15; i++) data = { [`level${i}`]: data }
    expect(() => createElement(data)).not.toThrow()
  })

  it('handles large arrays with chunked rendering', () => {
    const big = Array.from({ length: 200 }, (_, i) => `item-${i}`)
    const el = createElement(big)
    const rows = el.shadowRoot!.querySelectorAll('tr')
    // Should have root + 100 (first chunk) + show more = 102
    expect(rows.length).toBe(102)
  })

  it('handles setting source to null', () => {
    const el = createElement({ a: 1 }, { name: 'Test' }) as InstanceType<typeof JsonVista>
    el.source = null
    expect(el.shadowRoot!.querySelector('.source-header')).toBeNull()
  })
})
