import type { JsonValue, Match, Path, Source } from './types'
import { State } from './state'
import { Search } from './components/search'
import { TreeNode } from './components/tree/tree-node'
// @ts-ignore
import styles from '../styles/index.css?raw'

export class JsonExplorer extends HTMLElement {
  private shadow: ShadowRoot
  private state: State
  private search: Search | null = null
  private rootNode: TreeNode | null = null

  private _data: JsonValue = null
  private _source: Source | null = null

  // Toolbar state
  private displayData: JsonValue = null
  private _matches: Match[] = []
  private matchCount = 0
  private currentMatchIndex = 0
  private originalIndices: Record<string, string | number> = {}
  private isFiltered = false
  private isSorted = false
  private showNullValues = false

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.state = new State()
    this.injectStyles()
  }

  private injectStyles(): void {
    const style = document.createElement('style')
    style.textContent = styles
    this.shadow.appendChild(style)
  }

  // --- Properties ---

  set data(value: JsonValue) {
    this._data = value
    this.displayData = value
    this.resetSearchState()
    this.render()
  }

  get data(): JsonValue {
    return this._data
  }

  set source(value: Source | null) {
    this._source = value
    this.render()
  }

  get source(): Source | null {
    return this._source
  }

  // --- Lifecycle ---

  connectedCallback(): void {
    if (this._data !== null) this.render()
  }

  // --- Private ---

  private resetSearchState(): void {
    this._matches = []
    this.matchCount = 0
    this.currentMatchIndex = 0
    this.originalIndices = {}
    this.isFiltered = false
    this.isSorted = false
    this.state.resetHiddenPaths()
    this.state.setFirstMatchPath(null)
  }

  private getOriginalData(path: Path): JsonValue {
    return path.reduce<JsonValue>((d, key) => {
      if (d === null || typeof d !== 'object') return null
      return (d as Record<string, JsonValue>)[key as string] ?? (d as JsonValue[])[key as number] ?? null
    }, this._data)
  }

  private findFirstMatchPath(obj: JsonValue, matched: Match[], indices: Record<string, string | number>, path: Path = []): Path | null {
    if (matched.some(m => m.path.join('/') === path.join('/'))) return path
    if (typeof obj !== 'object' || obj === null) return null
    for (const [key, value] of Object.entries(obj as Record<string, JsonValue>)) {
      const nextPath = Array.isArray(obj)
        ? [...path, indices?.[path.concat(key).join('/')] ?? key]
        : [...path, key]
      const result = this.findFirstMatchPath(value, matched, indices, nextPath)
      if (result) return result
    }
    return null
  }

  private sortData(data: JsonValue): JsonValue {
    const sort = (obj: JsonValue): JsonValue => {
      if (typeof obj !== 'object' || obj === null) return obj
      if (Array.isArray(obj)) return (obj as JsonValue[]).map(sort)
      return Object.keys(obj as Record<string, JsonValue>).sort().reduce<Record<string, JsonValue>>((acc, key) => {
        acc[key] = sort((obj as Record<string, JsonValue>)[key])
        return acc
      }, {})
    }
    return sort(data)
  }

  private render(): void {
    // Clear previous content (except the style tag)
    const style = this.shadow.querySelector('style')!
    this.shadow.innerHTML = ''
    this.shadow.appendChild(style)

    this.search?.destroy?.()
    this.rootNode?.destroy()
    this.rootNode = null
    this.search = null

    if (this._data === null) return

    const container = document.createElement('div')

    // Source header
    if (this._source) {
      const header = document.createElement('div')
      header.className = 'source-header'
      const nameSpan = document.createElement('span')
      nameSpan.textContent = this._source.name ?? this._source.url ?? ''
      header.appendChild(nameSpan)
      if (this._source.url) {
        const link = document.createElement('a')
        link.href = this._source.url
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.title = 'Open source URL'
        link.textContent = '↗'
        header.appendChild(link)
      }
      container.appendChild(header)
    }

    const card = document.createElement('div')
    card.className = 'card'

    // Search panel
    this.search = new Search(
      (result) => {
        this.displayData = result.filteredData
        this._matches = result.matches
        this.matchCount = result.matchCount
        this.currentMatchIndex = 0
        this.originalIndices = result.originalIndices
        this.isFiltered = true
        this.state.setExpandToMatch(false)
        this.state.setFirstMatchPath(
          this.findFirstMatchPath(this._data, result.matches, result.originalIndices)
        )
        this.rerenderTree()
        this.renderToolbar(toolbar)
      },
      () => {
        this.displayData = this._data
        this._matches = []
        this.matchCount = 0
        this.originalIndices = {}
        this.isFiltered = false
        this.isSorted = false
        this.state.resetHiddenPaths()
        this.state.setFirstMatchPath(null)
        this.rerenderTree()
        this.renderToolbar(toolbar)
      }
    )
    this.search.setData(this.displayData, this._data)
    card.appendChild(this.search.element)

    // Toolbar
    const toolbar = document.createElement('div')
    toolbar.className = 'toolbar'
    this.renderToolbar(toolbar)
    card.appendChild(toolbar)

    // Tree table
    const tableWrapper = document.createElement('div')
    tableWrapper.className = 'tree-wrapper'
    const table = document.createElement('table')
    table.className = 'json-tree'
    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    tableWrapper.appendChild(table)
    card.appendChild(tableWrapper)

    container.appendChild(card)
    this.shadow.appendChild(container)

    this.renderTree(tbody)
  }

  private renderToolbar(toolbar: HTMLElement): void {
    toolbar.innerHTML = ''

    const btn = (label: string, onClick: () => void, extraClass = ''): HTMLButtonElement => {
      const b = document.createElement('button')
      b.className = `btn${extraClass ? ' ' + extraClass : ''}`
      b.textContent = label
      b.addEventListener('click', onClick)
      return b
    }

    const sortBtn = btn(this.isSorted ? 'Sorted A→Z' : 'Sort A→Z', () => {
      this.displayData = this.sortData(this.displayData)
      this.isSorted = true
      this.rerenderTree()
      this.renderToolbar(toolbar)
    }, 'btn-secondary')
    if (this.isSorted) (sortBtn as HTMLButtonElement).disabled = true
    toolbar.appendChild(sortBtn)

    toolbar.appendChild(btn(this.showNullValues ? 'Hide nulls' : 'Show nulls', () => {
      this.showNullValues = !this.showNullValues
      this.rerenderTree()
      this.renderToolbar(toolbar)
    }, 'btn-secondary'))

    toolbar.appendChild(btn(this.state.isPatternHideMode ? 'Edit visibility' : 'Done', () => {
      this.state.toggleHideMode()
      this.renderToolbar(toolbar)
    }))

    if (!this.state.isPatternHideMode) {
      toolbar.appendChild(btn('Reset hidden', () => {
        this.state.resetHiddenPaths()
      }, 'btn-danger'))
    }

    if (this.isFiltered) {
      toolbar.appendChild(btn('Next match', () => this.nextMatch()))
      const expandBtn = btn(
        this.state.expandToMatch ? 'Cancel expand' : 'Expand matches',
        () => {
          this.state.setExpandToMatch(!this.state.expandToMatch)
          this.renderToolbar(toolbar)
        }
      )
      expandBtn.title = this.state.expandToMatch ? 'Cancel expand' : 'Expand tree to show all matches'
      toolbar.appendChild(expandBtn)

      const countSpan = document.createElement('span')
      countSpan.className = 'match-count'
      countSpan.textContent = `${this.matchCount} match${this.matchCount !== 1 ? 'es' : ''}`
      toolbar.appendChild(countSpan)

      // Clear button via search component
      const clearBtn = document.createElement('button')
      clearBtn.className = 'btn btn-danger'
      clearBtn.textContent = 'Clear'
      clearBtn.addEventListener('click', () => {
        this.search?.clear()
      })
      toolbar.appendChild(clearBtn)
    }
  }

  private nextMatch(): void {
    if (!this._matches.length) return
    const nextIndex = (this.currentMatchIndex + 1) % this._matches.length
    const id = this._matches[nextIndex].id
    if (id) this.shadow.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    this.currentMatchIndex = nextIndex
  }

  private renderTree(tbody: HTMLTableSectionElement): void {
    this.rootNode?.destroy()
    this.rootNode = new TreeNode({
      originalData: this._data,
      data: this.displayData,
      name: 'root',
      matches: this._matches,
      depth: 0,
      path: [],
      getOriginalData: (path) => this.getOriginalData(path),
      isFiltered: this.isFiltered,
      originalIndices: this.originalIndices,
      showNullValues: this.showNullValues,
      state: this.state,
      root: this.shadow,
    })
    this.rootNode.appendTo(tbody)
  }

  private rerenderTree(): void {
    const tbody = this.shadow.querySelector('.json-tree tbody') as HTMLTableSectionElement | null
    if (!tbody) return
    tbody.innerHTML = ''
    this.renderTree(tbody)
    this.search?.setData(this.displayData, this._data)
  }
}

customElements.define('json-explorer', JsonExplorer)
