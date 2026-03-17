import type { JsonValue, Match } from '../types'
import { filterData } from '../search/filter'
import type { FilterOptions } from '../search/filter'

type PropertyType = 'string' | 'number'
type SearchType = 'partial' | 'exact'
type NumericCondition = 'equal' | 'not equal' | 'greater than' | 'less than'

const PROPERTY_TYPES: PropertyType[] = ['string', 'number']
const SEARCH_TYPES: SearchType[] = ['partial', 'exact']
const NUMERIC_CONDITIONS: NumericCondition[] = ['equal', 'not equal', 'greater than', 'less than']

interface SearchState {
  propertyType: PropertyType
  searchType: SearchType
  numericCondition: NumericCondition
  isCaseInsensitive: boolean
  keySearchType: SearchType
  isKeySearchEnabled: boolean
  secondaryPropertyType: PropertyType
  secondarySearchType: SearchType
  secondaryNumericCondition: NumericCondition
  isSecondaryCaseInsensitive: boolean
  secondaryKeySearchType: SearchType
  isSecondaryKeySearchEnabled: boolean
  isSecondarySearchEnabled: boolean
}

const DEFAULT_STATE: SearchState = {
  propertyType: 'string',
  searchType: 'partial',
  numericCondition: 'equal',
  isCaseInsensitive: true,
  keySearchType: 'partial',
  isKeySearchEnabled: true,
  secondaryPropertyType: 'string',
  secondarySearchType: 'partial',
  secondaryNumericCondition: 'equal',
  isSecondaryCaseInsensitive: true,
  secondaryKeySearchType: 'partial',
  isSecondaryKeySearchEnabled: true,
  isSecondarySearchEnabled: false,
}

export interface FilterResult {
  filteredData: JsonValue
  matches: Match[]
  matchCount: number
  originalIndices: Record<string, string | number>
}

export class Search {
  private el: HTMLElement
  private state: SearchState = { ...DEFAULT_STATE }
  private searchTerm = ''
  private keySearchTerm = ''
  private secondarySearchTerm = ''
  private secondaryKeySearchTerm = ''
  private data: JsonValue
  private originalData: JsonValue

  constructor(
    private onFilter: (result: FilterResult) => void,
    private onClear: () => void
  ) {
    this.data = null
    this.originalData = null
    this.el = document.createElement('div')
    this.el.className = 'search-panel'
    this.render()
  }

  get element(): HTMLElement {
    return this.el
  }

  setData(data: JsonValue, originalData: JsonValue): void {
    this.data = data
    this.originalData = originalData
  }

  private search(): void {
    if (!this.searchTerm.trim() && !this.keySearchTerm.trim()) return

    const opts: FilterOptions = {
      searchTerm: this.searchTerm,
      propertyType: this.state.propertyType,
      searchType: this.state.searchType,
      numericCondition: this.state.numericCondition,
      isCaseInsensitive: this.state.isCaseInsensitive,
      keySearchTerm: this.keySearchTerm,
      keySearchType: this.state.keySearchType,
      isKeySearchEnabled: this.state.isKeySearchEnabled,
      isSecondarySearchEnabled: this.state.isSecondarySearchEnabled,
      secondarySearchTerm: this.secondarySearchTerm,
      secondaryPropertyType: this.state.secondaryPropertyType,
      secondarySearchType: this.state.secondarySearchType,
      secondaryNumericCondition: this.state.secondaryNumericCondition,
      isSecondaryCaseInsensitive: this.state.isSecondaryCaseInsensitive,
      secondaryKeySearchTerm: this.secondaryKeySearchTerm,
      secondaryKeySearchType: this.state.secondaryKeySearchType,
      isSecondaryKeySearchEnabled: this.state.isSecondaryKeySearchEnabled,
    }

    const result = filterData(this.data, opts, this.originalData)
    this.onFilter({
      filteredData: result.data ?? {},
      matches: result.matches,
      matchCount: result.matchedCount,
      originalIndices: result.originalIndices,
    })
  }

  clear(): void {
    this.searchTerm = ''
    this.keySearchTerm = ''
    this.secondarySearchTerm = ''
    this.secondaryKeySearchTerm = ''
    this.state = { ...DEFAULT_STATE }
    this.onClear()
    this.render()
  }

  destroy(): void {
    this.el.remove()
  }

  private set<K extends keyof SearchState>(key: K, value: SearchState[K]): void {
    this.state = { ...this.state, [key]: value }
    this.render()
  }

  private onEnter(fn: () => void): (e: KeyboardEvent) => void {
    return (e) => { if (e.key === 'Enter') fn() }
  }

  private makeSelect(options: string[], value: string, onChange: (v: string) => void): HTMLSelectElement {
    const sel = document.createElement('select')
    sel.className = 'select'
    options.forEach(opt => {
      const o = document.createElement('option')
      o.value = opt
      o.textContent = opt
      if (opt === value) o.selected = true
      sel.appendChild(o)
    })
    sel.addEventListener('change', () => onChange(sel.value))
    return sel
  }

  private makeInput(placeholder: string, value: string, onChange: (v: string) => void, onEnterFn?: () => void): HTMLInputElement {
    const input = document.createElement('input')
    input.className = 'input'
    input.placeholder = placeholder
    input.value = value
    input.addEventListener('input', () => onChange(input.value))
    if (onEnterFn) input.addEventListener('keydown', this.onEnter(onEnterFn))
    return input
  }

  private makeCaseToggle(checked: boolean, onChange: (v: boolean) => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = `btn-case-toggle${checked ? ' active' : ''}`
    btn.title = checked ? 'Case-insensitive — click to match case' : 'Case-sensitive — click to ignore case'
    btn.textContent = 'Aa'
    btn.addEventListener('click', () => onChange(!checked))
    return btn
  }

  private makeChip(label: string, active: boolean, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = `btn-chip${active ? ' active' : ''}`
    btn.textContent = label
    btn.addEventListener('click', onClick)
    return btn
  }

  private makeKeyRow(
    value: string,
    searchType: SearchType,
    onChange: (v: string) => void,
    onEnterFn: () => void,
    onTypeChange: (v: string) => void
  ): HTMLElement {
    const row = document.createElement('div')
    row.className = 'search-row search-row--sub'
    const label = document.createElement('span')
    label.className = 'search-key-label'
    label.textContent = 'key'
    row.appendChild(label)
    row.appendChild(this.makeInput('Filter by key…', value, onChange, onEnterFn))
    row.appendChild(this.makeSelect(SEARCH_TYPES, searchType, onTypeChange))
    return row
  }

  private makeValueRow(
    placeholder: string,
    term: string,
    propType: PropertyType,
    searchType: SearchType,
    condition: NumericCondition,
    ci: boolean,
    onTermChange: (v: string) => void,
    onEnterFn: () => void,
    onPropTypeChange: (v: string) => void,
    onSearchTypeChange: (v: string) => void,
    onConditionChange: (v: string) => void,
    onCiChange: (v: boolean) => void,
    trailingItems: HTMLElement[]
  ): HTMLElement {
    const row = document.createElement('div')
    row.className = 'search-row'
    row.appendChild(this.makeInput(placeholder, term, onTermChange, onEnterFn))
    row.appendChild(this.makeSelect(PROPERTY_TYPES, propType, onPropTypeChange))
    if (propType === 'string') {
      row.appendChild(this.makeSelect(SEARCH_TYPES, searchType, onSearchTypeChange))
      row.appendChild(this.makeCaseToggle(ci, onCiChange))
    }
    if (propType === 'number') {
      row.appendChild(this.makeSelect(NUMERIC_CONDITIONS, condition, onConditionChange))
    }
    for (const el of trailingItems) row.appendChild(el)
    return row
  }

  private render(): void {
    this.el.innerHTML = ''
    const s = this.state

    const searchBtn = document.createElement('button')
    searchBtn.className = 'btn btn-search'
    searchBtn.textContent = 'Search'
    searchBtn.disabled = !this.searchTerm.trim() && !this.keySearchTerm.trim()

    const updateSearchBtn = () => {
      searchBtn.disabled = !this.searchTerm.trim() && !this.keySearchTerm.trim()
    }
    searchBtn.addEventListener('click', () => this.search())

    // ── Primary value row ──────────────────────────────────
    this.el.appendChild(this.makeValueRow(
      'Search values…',
      this.searchTerm,
      s.propertyType,
      s.searchType,
      s.numericCondition,
      s.isCaseInsensitive,
      v => { this.searchTerm = v; updateSearchBtn() },
      () => this.searchTerm.trim() && this.search(),
      v => this.set('propertyType', v as PropertyType),
      v => this.set('searchType', v as SearchType),
      v => this.set('numericCondition', v as NumericCondition),
      v => this.set('isCaseInsensitive', v),
      [
        searchBtn,
        this.makeChip('Key', s.isKeySearchEnabled, () => this.set('isKeySearchEnabled', !s.isKeySearchEnabled)),
        this.makeChip('2nd', s.isSecondarySearchEnabled, () => this.set('isSecondarySearchEnabled', !s.isSecondarySearchEnabled)),
      ]
    ))

    // ── Primary key row ────────────────────────────────────
    if (s.isKeySearchEnabled) {
      this.el.appendChild(this.makeKeyRow(
        this.keySearchTerm,
        s.keySearchType,
        v => { this.keySearchTerm = v; updateSearchBtn() },
        () => this.keySearchTerm.trim() && this.search(),
        v => this.set('keySearchType', v as SearchType)
      ))
    }

    // ── Secondary search ───────────────────────────────────
    if (s.isSecondarySearchEnabled) {
      const divider = document.createElement('div')
      divider.className = 'search-divider'
      divider.textContent = 'and also'
      this.el.appendChild(divider)

      this.el.appendChild(this.makeValueRow(
        'Secondary values…',
        this.secondarySearchTerm,
        s.secondaryPropertyType,
        s.secondarySearchType,
        s.secondaryNumericCondition,
        s.isSecondaryCaseInsensitive,
        v => { this.secondarySearchTerm = v; updateSearchBtn() },
        () => this.secondarySearchTerm.trim() && this.search(),
        v => this.set('secondaryPropertyType', v as PropertyType),
        v => this.set('secondarySearchType', v as SearchType),
        v => this.set('secondaryNumericCondition', v as NumericCondition),
        v => this.set('isSecondaryCaseInsensitive', v),
        [this.makeChip('Key', s.isSecondaryKeySearchEnabled, () => this.set('isSecondaryKeySearchEnabled', !s.isSecondaryKeySearchEnabled))]
      ))

      if (s.isSecondaryKeySearchEnabled) {
        this.el.appendChild(this.makeKeyRow(
          this.secondaryKeySearchTerm,
          s.secondaryKeySearchType,
          v => { this.secondaryKeySearchTerm = v; updateSearchBtn() },
          () => this.secondaryKeySearchTerm.trim() && this.search(),
          v => this.set('secondaryKeySearchType', v as SearchType)
        ))
      }
    }
  }
}
