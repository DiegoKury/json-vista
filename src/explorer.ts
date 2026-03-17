import type { JsonValue, Match, Path, Source } from './types'
import { State } from './state'
import { Search } from './components/search'
import { TreeNode } from './components/tree/tree-node'
import styles from '../styles/index.css?raw'

export class JsonVista extends HTMLElement {
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
  private currentMatchIndex = -1
  private originalIndices: Record<string, string | number> = {}
  private isFiltered = false
  private isSorted = false

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
    this.currentMatchIndex = -1
    this.originalIndices = {}
    this.isFiltered = false
    this.isSorted = false
    this.state.setShowNullValues(false)
    this.state.resetHiddenPaths()
    this.state.setFirstMatchPath(null)
    this.state.setExpandToPath(null)
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
        this.currentMatchIndex = -1
        this.originalIndices = result.originalIndices
        this.isFiltered = true
        this.state.setExpandToMatch(false)
        this.state.setExpandToPath(null)
        this.rerenderTree()
        this.state.setFirstMatchPath(
          this.findFirstMatchPath(this._data, result.matches, result.originalIndices)
        )
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
        this.state.setExpandToPath(null)
        this.rerenderTree()
        this.renderToolbar(toolbar)
      }
    )
    this.search.setData(this._data, this._data)
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

    const btn = (label: string, onClick: () => void, extraClass = '', title = ''): HTMLButtonElement => {
      const b = document.createElement('button')
      b.className = `btn${extraClass ? ' ' + extraClass : ''}`
      b.textContent = label
      if (title) b.title = title
      b.addEventListener('click', onClick)
      return b
    }

    const sep = (): HTMLSpanElement => {
      const s = document.createElement('span')
      s.className = 'toolbar-sep'
      return s
    }

    // ── Utility group ──────────────────────────────────────
    const sortBtn = btn(
      this.isSorted ? 'Sorted A→Z' : 'Sort A→Z',
      () => { this.displayData = this.sortData(this.displayData); this.isSorted = true; this.rerenderTree(); this.renderToolbar(toolbar) },
      'btn-secondary',
      this.isSorted ? 'Keys are already sorted' : 'Sort all keys alphabetically'
    )
    if (this.isSorted) sortBtn.disabled = true
    toolbar.appendChild(sortBtn)

    toolbar.appendChild(btn(
      this.state.showNullValues ? 'Hide nulls' : 'Show nulls',
      () => { this.state.setShowNullValues(!this.state.showNullValues); this.renderToolbar(toolbar) },
      'btn-secondary',
      this.state.showNullValues ? 'Hide null values' : 'Show null values'
    ))

    toolbar.appendChild(sep())

    toolbar.appendChild(btn(
      this.state.isPatternHideMode ? 'Hide props' : '✓ Done hiding',
      () => { this.state.toggleHideMode(); this.renderToolbar(toolbar) },
      this.state.isPatternHideMode ? '' : 'btn-active',
      this.state.isPatternHideMode ? 'Click checkboxes on rows to hide properties' : 'Exit hide-property mode'
    ))

    if (!this.state.isPatternHideMode) {
      toolbar.appendChild(btn('↺ Reset', () => { this.state.resetHiddenPaths() }, 'btn-danger', 'Restore all hidden properties'))
    }

    // ── Filter group ───────────────────────────────────────
    if (this.isFiltered) {
      toolbar.appendChild(sep())

      const countSpan = document.createElement('span')
      countSpan.className = 'match-count'
      const pos = this.currentMatchIndex >= 0 ? `${this.currentMatchIndex + 1} / ` : ''
      countSpan.textContent = `${pos}${this.matchCount} match${this.matchCount !== 1 ? 'es' : ''}`
      toolbar.appendChild(countSpan)

      const nextLabel = this.currentMatchIndex === -1 ? '→ Jump to first' : '→ Next'
      const nextBtn = btn(nextLabel, () => this.nextMatch(), 'btn-next', 'Jump to next match')
      toolbar.appendChild(nextBtn)

      const expandBtn = btn(
        '⇕ Expand',
        () => { this.state.setExpandToMatch(!this.state.expandToMatch); this.renderToolbar(toolbar) },
        this.state.expandToMatch ? 'btn-active' : '',
        this.state.expandToMatch ? 'Collapse expanded matches' : 'Expand tree to reveal all matches'
      )
      toolbar.appendChild(expandBtn)

      toolbar.appendChild(btn('✕ Clear', () => { this.search?.clear() }, 'btn-danger', 'Clear search and restore full tree'))

      // Breadcrumb — shows path to the currently focused match, wraps to its own line
      const breadcrumb = document.createElement('div')
      breadcrumb.className = 'match-breadcrumb'
      if (this.currentMatchIndex >= 0 && this._matches[this.currentMatchIndex]) {
        breadcrumb.textContent = ['root', ...this._matches[this.currentMatchIndex].path].join(' › ')
      }
      toolbar.appendChild(breadcrumb)
    }
  }

  private nextMatch(): void {
    if (!this._matches.length) return

    // Remove focus ring from the previously focused row
    this.shadow.querySelector('tr.match-current')?.classList.remove('match-current')

    this.currentMatchIndex = (this.currentMatchIndex + 1) % this._matches.length
    const match = this._matches[this.currentMatchIndex]

    // Collapse all non-root nodes, then expand only the exact path to this match.
    // setExpandToPath uses full-path prefix matching so only ancestors of this
    // specific match are opened — setFirstMatchPath is not used here because it
    // matches by node name only and would expand every node with the same name.
    this.state.setCollapseDepth(0)
    this.state.setCollapseDepth(null)
    this.state.setExpandToPath([...match.path])

    // Defer scroll + highlight until after the expansion has updated the DOM
    requestAnimationFrame(() => {
      if (match.id) {
        const el = this.shadow.getElementById(match.id)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.classList.add('match-current')
      }
    })

    this.updateMatchNav()
  }

  private updateMatchNav(): void {
    const counter = this.shadow.querySelector('.match-count')
    if (counter) {
      const pos = this.currentMatchIndex >= 0 ? `${this.currentMatchIndex + 1} / ` : ''
      counter.textContent = `${pos}${this.matchCount} match${this.matchCount !== 1 ? 'es' : ''}`
    }
    // Switch button label from "Jump to first" → "Next" after first navigation
    const nextBtn = this.shadow.querySelector<HTMLButtonElement>('.btn-next')
    if (nextBtn) nextBtn.textContent = '→ Next'

    const breadcrumb = this.shadow.querySelector('.match-breadcrumb')
    if (breadcrumb && this.currentMatchIndex >= 0) {
      const match = this._matches[this.currentMatchIndex]
      breadcrumb.textContent = match ? ['root', ...match.path].join(' › ') : ''
    }
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
    this.search?.setData(this._data, this._data)
  }
}

customElements.define('json-vista', JsonVista)
