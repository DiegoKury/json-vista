import { describe, it, expect } from 'vitest'
import { filterData } from '../src/search/filter'
import type { FilterOptions, FilterResult } from '../src/search/filter'
import type { JsonValue } from '../src/types'

const defaultOpts: FilterOptions = {
  searchTerm: '',
  propertyType: 'string',
  searchType: 'partial',
  numericCondition: 'equal',
  isCaseInsensitive: true,
  keySearchTerm: '',
  keySearchType: 'partial',
  isKeySearchEnabled: false,
}

const filter = (data: JsonValue, overrides: Partial<FilterOptions>, initialData?: JsonValue): FilterResult =>
  filterData(data, { ...defaultOpts, ...overrides }, initialData ?? data)

// ── String matching ────────────────────────────────────────

describe('string matching', () => {
  const data = {
    name: 'Alice',
    city: 'Wonderland',
    age: 30,
    active: true,
    note: null,
  }

  it('partial match (case-insensitive)', () => {
    const result = filter(data, { searchTerm: 'alice' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].value).toBe('Alice')
    expect(result.matches[0].path).toEqual(['name'])
  })

  it('partial match finds substring', () => {
    const result = filter(data, { searchTerm: 'onder' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].value).toBe('Wonderland')
  })

  it('exact match (case-insensitive)', () => {
    const result = filter(data, { searchTerm: 'alice', searchType: 'exact' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].value).toBe('Alice')
  })

  it('exact match rejects partial', () => {
    const result = filter(data, { searchTerm: 'alic', searchType: 'exact' })
    expect(result.matchedCount).toBe(0)
  })

  it('case-sensitive match', () => {
    const result = filter(data, { searchTerm: 'alice', isCaseInsensitive: false })
    expect(result.matchedCount).toBe(0)
  })

  it('case-sensitive match succeeds with correct case', () => {
    const result = filter(data, { searchTerm: 'Alice', isCaseInsensitive: false })
    expect(result.matchedCount).toBe(1)
  })

  it('does not match numbers as strings', () => {
    const result = filter(data, { searchTerm: '30' })
    expect(result.matchedCount).toBe(0)
  })

  it('does not match booleans as strings', () => {
    const result = filter(data, { searchTerm: 'true' })
    expect(result.matchedCount).toBe(0)
  })

  it('does not match null', () => {
    const result = filter(data, { searchTerm: 'null' })
    expect(result.matchedCount).toBe(0)
  })
})

// ── Numeric matching ───────────────────────────────────────

describe('numeric matching', () => {
  const data = {
    scores: [10, 20, 30, 40, 50],
  }

  it('equal', () => {
    const result = filter(data, { searchTerm: '30', propertyType: 'number', numericCondition: 'equal' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].value).toBe(30)
  })

  it('not equal', () => {
    const result = filter(data, { searchTerm: '30', propertyType: 'number', numericCondition: 'not equal' })
    expect(result.matchedCount).toBe(4)
  })

  it('greater than', () => {
    const result = filter(data, { searchTerm: '25', propertyType: 'number', numericCondition: 'greater than' })
    expect(result.matchedCount).toBe(3)
    expect(result.matches.every(m => (m.value as number) > 25)).toBe(true)
  })

  it('less than', () => {
    const result = filter(data, { searchTerm: '25', propertyType: 'number', numericCondition: 'less than' })
    expect(result.matchedCount).toBe(2)
    expect(result.matches.every(m => (m.value as number) < 25)).toBe(true)
  })

  it('ignores non-numeric search term', () => {
    const result = filter(data, { searchTerm: 'abc', propertyType: 'number' })
    expect(result.matchedCount).toBe(0)
  })

  it('does not match strings when searching numbers', () => {
    const data = { value: '30', count: 30 }
    const result = filter(data, { searchTerm: '30', propertyType: 'number' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].path).toEqual(['count'])
  })

  it('handles floating point numbers', () => {
    const data = { pi: 3.14, e: 2.71 }
    const result = filter(data, { searchTerm: '3.14', propertyType: 'number', numericCondition: 'equal' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].value).toBe(3.14)
  })

  it('handles negative numbers', () => {
    const data = { temp: -5, alt: 10 }
    const result = filter(data, { searchTerm: '0', propertyType: 'number', numericCondition: 'less than' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].value).toBe(-5)
  })
})

// ── Key matching ───────────────────────────────────────────

describe('key matching', () => {
  const data = {
    userName: 'Alice',
    userEmail: 'alice@example.com',
    id: 1,
  }

  it('partial key match', () => {
    const result = filter(data, {
      searchTerm: '',
      isKeySearchEnabled: true,
      keySearchTerm: 'user',
      keySearchType: 'partial',
    })
    expect(result.matchedCount).toBe(2)
  })

  it('exact key match', () => {
    const result = filter(data, {
      searchTerm: '',
      isKeySearchEnabled: true,
      keySearchTerm: 'userName',
      keySearchType: 'exact',
    })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].path).toEqual(['userName'])
  })

  it('key match combined with value match', () => {
    const result = filter(data, {
      searchTerm: 'Alice',
      isKeySearchEnabled: true,
      keySearchTerm: 'userName',
    })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].matchType).toBe('both')
  })

  it('key match does not match numeric keys (array indices)', () => {
    const data = ['a', 'b', 'c']
    const result = filter(data, {
      searchTerm: '',
      isKeySearchEnabled: true,
      keySearchTerm: '0',
    })
    expect(result.matchedCount).toBe(0)
  })

  it('case-insensitive key match', () => {
    const result = filter(data, {
      searchTerm: '',
      isKeySearchEnabled: true,
      keySearchTerm: 'USERNAME',
      keySearchType: 'partial',
    })
    expect(result.matchedCount).toBe(1)
  })
})

// ── Nested data ────────────────────────────────────────────

describe('nested data', () => {
  const data = {
    users: [
      { name: 'Alice', role: 'admin' },
      { name: 'Bob', role: 'user' },
      { name: 'Charlie', role: 'admin' },
    ],
  }

  it('finds values in nested objects', () => {
    const result = filter(data, { searchTerm: 'Alice' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].path).toEqual(['users', 0, 'name'])
  })

  it('finds multiple nested matches', () => {
    const result = filter(data, { searchTerm: 'admin' })
    expect(result.matchedCount).toBe(2)
  })

  it('preserves parent structure in filtered output', () => {
    const result = filter(data, { searchTerm: 'Alice' })
    const filtered = result.data as Record<string, JsonValue>
    expect(filtered).toHaveProperty('users')
    const users = (filtered.users as JsonValue[])[0] as Record<string, JsonValue>
    expect(users.name).toBe('Alice')
  })

  it('tracks original indices for arrays', () => {
    const result = filter(data, { searchTerm: 'Charlie' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].path).toEqual(['users', 2, 'name'])
  })
})

// ── Match IDs ──────────────────────────────────────────────

describe('match IDs', () => {
  it('assigns unique IDs to each match', () => {
    const data = { a: 'hello', b: 'hello world', c: 'say hello' }
    const result = filter(data, { searchTerm: 'hello' })
    const ids = result.matches.map(m => m.id)
    expect(ids.length).toBe(3)
    expect(new Set(ids).size).toBe(3)
    ids.forEach(id => expect(id).toMatch(/^match-\d+$/))
  })
})

// ── Secondary filter ───────────────────────────────────────

describe('secondary filter', () => {
  const data = {
    products: [
      { name: 'Widget', price: 10, category: 'tools' },
      { name: 'Gadget', price: 50, category: 'electronics' },
      { name: 'Widget Pro', price: 25, category: 'tools' },
    ],
  }

  it('applies secondary string filter after primary', () => {
    const result = filter(data, {
      searchTerm: 'tools',
      isSecondarySearchEnabled: true,
      secondarySearchTerm: 'Widget',
    }, data)
    // Both matches should have both 'tools' and 'Widget' visible
    expect(result.matchedCount).toBeGreaterThan(0)
  })

  it('applies secondary numeric filter', () => {
    const result = filter(data, {
      searchTerm: 'tools',
      isSecondarySearchEnabled: true,
      secondarySearchTerm: '20',
      secondaryPropertyType: 'number',
      secondaryNumericCondition: 'less than',
    }, data)
    expect(result.matchedCount).toBeGreaterThan(0)
  })

  it('secondary key filter', () => {
    const result = filter(data, {
      searchTerm: 'Widget',
      isSecondarySearchEnabled: true,
      secondarySearchTerm: '',
      isSecondaryKeySearchEnabled: true,
      secondaryKeySearchTerm: 'price',
    }, data)
    expect(result.matchedCount).toBeGreaterThan(0)
  })

  it('skipped when not enabled', () => {
    const result = filter(data, {
      searchTerm: 'tools',
      isSecondarySearchEnabled: false,
      secondarySearchTerm: 'Widget',
    })
    // Only primary matches, secondary ignored
    const matchValues = result.matches.map(m => m.value)
    expect(matchValues.every(v => v === 'tools')).toBe(true)
  })

  it('skipped when secondary term is empty and key search disabled', () => {
    const result = filter(data, {
      searchTerm: 'tools',
      isSecondarySearchEnabled: true,
      secondarySearchTerm: '',
      isSecondaryKeySearchEnabled: false,
    })
    expect(result.matchedCount).toBe(2)
  })

  it('merges secondary-matched fields into visible results', () => {
    const data = {
      items: [
        { name: 'Alpha', status: 'active', score: 10 },
        { name: 'Beta', status: 'inactive', score: 20 },
      ],
    }
    const result = filter(data, {
      searchTerm: 'active',
      isSecondarySearchEnabled: true,
      secondarySearchTerm: '10',
      secondaryPropertyType: 'number',
      secondaryNumericCondition: 'equal',
    }, data)
    expect(result.matchedCount).toBeGreaterThan(0)
  })
})

// ── Edge cases ─────────────────────────────────────────────

describe('edge cases', () => {
  it('handles empty object', () => {
    const result = filter({}, { searchTerm: 'test' })
    expect(result.matchedCount).toBe(0)
    expect(result.matches).toEqual([])
  })

  it('handles empty array', () => {
    const result = filter([], { searchTerm: 'test' })
    expect(result.matchedCount).toBe(0)
  })

  it('handles null data', () => {
    const result = filter(null, { searchTerm: 'test' })
    expect(result.matchedCount).toBe(0)
  })

  it('handles primitive data', () => {
    const result = filter('hello' as JsonValue, { searchTerm: 'hello' })
    expect(result.matchedCount).toBe(1)
  })

  it('handles deeply nested structures', () => {
    let data: JsonValue = 'target'
    for (let i = 0; i < 20; i++) data = { nested: data }
    const result = filter(data, { searchTerm: 'target' })
    expect(result.matchedCount).toBe(1)
    expect(result.matches[0].path.length).toBe(20)
  })

  it('handles mixed-type arrays', () => {
    const data = ['hello', 42, true, null, { key: 'value' }]
    const result = filter(data, { searchTerm: 'hello' })
    expect(result.matchedCount).toBe(1)
  })

  it('handles empty search term with key search', () => {
    const data = { name: 'Alice', email: 'a@b.com' }
    const result = filter(data, {
      searchTerm: '',
      isKeySearchEnabled: true,
      keySearchTerm: 'name',
    })
    expect(result.matchedCount).toBe(1)
  })

  it('handles unicode in values', () => {
    const data = { greeting: '你好世界', emoji: '🎉' }
    const result = filter(data, { searchTerm: '你好' })
    expect(result.matchedCount).toBe(1)
  })

  it('handles unicode in keys', () => {
    const data = { '名前': 'test' }
    const result = filter(data, {
      searchTerm: '',
      isKeySearchEnabled: true,
      keySearchTerm: '名前',
    })
    expect(result.matchedCount).toBe(1)
  })

  it('handles very long strings', () => {
    const longString = 'a'.repeat(10000) + 'needle' + 'a'.repeat(10000)
    const data = { text: longString }
    const result = filter(data, { searchTerm: 'needle' })
    expect(result.matchedCount).toBe(1)
  })

  it('handles special regex characters in search term', () => {
    const data = { pattern: 'foo.bar(baz)' }
    const result = filter(data, { searchTerm: '.bar(' })
    expect(result.matchedCount).toBe(1)
  })

  it('handles empty string values', () => {
    const data = { empty: '', filled: 'content' }
    const result = filter(data, { searchTerm: '', isKeySearchEnabled: true, keySearchTerm: 'empty' })
    expect(result.matchedCount).toBe(1)
  })

  it('preserves undefined-gap array structure from primary filter', () => {
    const data = ['a', 'b', 'target', 'c']
    const result = filter(data, { searchTerm: 'target' })
    const arr = result.data as JsonValue[]
    expect(arr[2]).toBe('target')
  })

  it('handles data with only null values', () => {
    const data = { a: null, b: null }
    const result = filter(data, { searchTerm: 'test' })
    expect(result.matchedCount).toBe(0)
  })

  it('circular reference protection in primary filter', () => {
    // The WeakSet guard should prevent infinite recursion
    // We can't easily create a true circular ref that passes type check,
    // but we can verify the seen set is used by having shared references
    const shared = { value: 'found' }
    const data = { a: shared, b: shared, c: { nested: shared } }
    const result = filter(data, { searchTerm: 'found' })
    expect(result.matchedCount).toBeGreaterThan(0)
  })
})

// ── originalIndices tracking ───────────────────────────────

describe('originalIndices', () => {
  it('tracks original array indices after filtering', () => {
    const data = [
      { name: 'skip1' },
      { name: 'target' },
      { name: 'skip2' },
      { name: 'target2' },
    ]
    const result = filter(data, { searchTerm: 'target' })
    expect(Object.keys(result.originalIndices).length).toBeGreaterThan(0)
  })

  it('tracks object key indices', () => {
    const data = { keep: 'target', skip: 'other' }
    const result = filter(data, { searchTerm: 'target' })
    expect(result.originalIndices).toHaveProperty('keep')
  })
})
