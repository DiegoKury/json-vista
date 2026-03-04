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

  private makeBtn(label: string, onClick: () => void, extraClass = ''): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = `btn${extraClass ? ' ' + extraClass : ''}`
    btn.textContent = label
    btn.addEventListener('click', onClick)
    return btn
  }

  private makeCheckboxLabel(label: string, checked: boolean, onChange: (v: boolean) => void): HTMLLabelElement {
    const lbl = document.createElement('label')
    lbl.className = 'checkbox-label'
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = checked
    cb.addEventListener('change', () => onChange(cb.checked))
    lbl.appendChild(cb)
    lbl.appendChild(document.createTextNode(label))
    return lbl
  }

  private render(): void {
    this.el.innerHTML = ''
    const s = this.state

    // Primary row (key search + controls)
    const row1 = document.createElement('div')
    row1.className = 'search-row'

    const searchBtn = this.makeBtn('Search', () => this.search())
    searchBtn.disabled = !this.searchTerm.trim() && !this.keySearchTerm.trim()

    const updateSearchBtn = () => {
      searchBtn.disabled = !this.searchTerm.trim() && !this.keySearchTerm.trim()
    }

    if (s.isKeySearchEnabled) {
      row1.appendChild(this.makeInput('Search keys...', this.keySearchTerm, v => { this.keySearchTerm = v; updateSearchBtn() }, () => this.keySearchTerm.trim() && this.search()))
      row1.appendChild(this.makeSelect(SEARCH_TYPES, s.keySearchType, v => this.set('keySearchType', v as SearchType)))
    }

    row1.appendChild(searchBtn)

    if (s.propertyType === 'string') {
      row1.appendChild(this.makeCheckboxLabel('Case insensitive', s.isCaseInsensitive, v => this.set('isCaseInsensitive', v)))
    }

    row1.appendChild(this.makeBtn(s.isKeySearchEnabled ? '− Key search' : '+ Key search', () => this.set('isKeySearchEnabled', !s.isKeySearchEnabled)))
    row1.appendChild(this.makeBtn(s.isSecondarySearchEnabled ? '− Secondary' : '+ Secondary', () => this.set('isSecondarySearchEnabled', !s.isSecondarySearchEnabled)))

    this.el.appendChild(row1)

    // Primary value row
    const row2 = document.createElement('div')
    row2.className = 'search-row'
    row2.appendChild(this.makeInput('Search values...', this.searchTerm, v => { this.searchTerm = v; updateSearchBtn() }, () => this.searchTerm.trim() && this.search()))
    row2.appendChild(this.makeSelect(PROPERTY_TYPES, s.propertyType, v => this.set('propertyType', v as PropertyType)))
    if (s.propertyType === 'string') {
      row2.appendChild(this.makeSelect(SEARCH_TYPES, s.searchType, v => this.set('searchType', v as SearchType)))
    }
    if (s.propertyType === 'number') {
      row2.appendChild(this.makeSelect(NUMERIC_CONDITIONS, s.numericCondition, v => this.set('numericCondition', v as NumericCondition)))
    }

    this.el.appendChild(row2)

    // Secondary search
    if (s.isSecondarySearchEnabled) {
      const row3 = document.createElement('div')
      row3.className = 'search-row'

      if (s.isSecondaryKeySearchEnabled) {
        row3.appendChild(this.makeInput('Secondary keys...', this.secondaryKeySearchTerm, v => { this.secondaryKeySearchTerm = v }, () => this.secondaryKeySearchTerm.trim() && this.search()))
        row3.appendChild(this.makeSelect(SEARCH_TYPES, s.secondaryKeySearchType, v => this.set('secondaryKeySearchType', v as SearchType)))
      }

      row3.appendChild(this.makeCheckboxLabel('Case insensitive', s.isSecondaryCaseInsensitive, v => this.set('isSecondaryCaseInsensitive', v)))
      row3.appendChild(this.makeBtn(s.isSecondaryKeySearchEnabled ? '− Key search' : '+ Key search', () => this.set('isSecondaryKeySearchEnabled', !s.isSecondaryKeySearchEnabled)))
      this.el.appendChild(row3)

      const row4 = document.createElement('div')
      row4.className = 'search-row'
      row4.appendChild(this.makeInput('Secondary values...', this.secondarySearchTerm, v => { this.secondarySearchTerm = v }, () => this.secondarySearchTerm.trim() && this.search()))
      row4.appendChild(this.makeSelect(PROPERTY_TYPES, s.secondaryPropertyType, v => this.set('secondaryPropertyType', v as PropertyType)))
      if (s.secondaryPropertyType === 'string') {
        row4.appendChild(this.makeSelect(SEARCH_TYPES, s.secondarySearchType, v => this.set('secondarySearchType', v as SearchType)))
      }
      if (s.secondaryPropertyType === 'number') {
        row4.appendChild(this.makeSelect(NUMERIC_CONDITIONS, s.secondaryNumericCondition, v => this.set('secondaryNumericCondition', v as NumericCondition)))
      }
      this.el.appendChild(row4)
    }
  }

}
