import type { JsonValue, Path, Match, HiddenPath } from '../../types'
import type { State } from '../../state'

// SVG icons for inline tree actions
const iconEyeOff = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
const iconEye = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
const iconEyeFilter = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="19" y1="5" x2="22" y2="2"/></svg>`
const iconBarChart = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>`
import { isObject, isArray, isCollectionEmpty, cleanData, getIndentationStyle, getGeneralizedSegment } from '../../utils/utils'
import { isPathHidden } from '../../utils/path-utils'
import { createScalarDisplay } from './scalar-display'
import { createNodeToggle } from './node-toggle'
import { DistinctValuesDialog } from './distinct-values-dialog'

const CHUNK_SIZE = 100

interface TreeNodeOptions {
  originalData: JsonValue
  data: JsonValue
  name: string | number
  matches: Match[]
  depth: number
  path: Path
  getOriginalData: (path: Path) => JsonValue
  isFiltered: boolean
  expandAll?: boolean
  parentUnfiltered?: boolean
  parentExpanded?: boolean
  originalIndices?: Record<string, string | number>
  state: State
  root: ShadowRoot | HTMLElement
}

const countBy = (arr: JsonValue[]): Record<string, number> =>
  arr.reduce<Record<string, number>>((acc, val) => {
    const k = String(val)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

export class TreeNode {
  private tr: HTMLTableRowElement
  private childNodes: TreeNode[] = []
  private collapsed: boolean
  private deepExpand = false
  private expandedByClick: boolean
  private showUnfiltered = false
  private dialog: DistinctValuesDialog | null = null
  private unsubscribe: (() => void) | null = null
  private renderedCount = 0
  private showMoreRow: HTMLTableRowElement | null = null

  private opts: TreeNodeOptions

  constructor(opts: TreeNodeOptions) {
    this.opts = opts
    this.collapsed = true
    this.expandedByClick = opts.parentExpanded ?? false
    this.tr = document.createElement('tr')
    this.unsubscribe = opts.state.subscribe(() => this.onStateChange())
    this.render()
  }

  get element(): HTMLTableRowElement {
    return this.tr
  }

  // Returns all DOM rows this node and its children occupy
  get rows(): HTMLTableRowElement[] {
    const result: HTMLTableRowElement[] = [this.tr]
    for (const child of this.childNodes) {
      result.push(...child.rows)
    }
    if (this.showMoreRow) result.push(this.showMoreRow)
    return result
  }

  private onStateChange(): void {
    const { state, path } = this.opts

    // Handle collapseDepth
    if (state.collapseDepth !== null && this.opts.depth >= state.collapseDepth + 1) {
      this.setCollapsed(true)
    }

    // Handle expandToPath — expand only nodes whose full path is a strict prefix
    // of the target path (avoids the name-only matching issue of firstMatchPath)
    if (state.expandToPath) {
      const target = state.expandToPath
      const myPath = path
      if (
        myPath.length < target.length &&
        myPath.every((seg, i) => seg === target[i]) &&
        (isObject(this.opts.data) || isArray(this.opts.data))
      ) {
        this.setCollapsed(false)
        this.ensureChildRendered(target[myPath.length])
      }
    }

    // Handle firstMatchPath auto-expand
    if (state.firstMatchPath && state.firstMatchPath[0] === this.opts.name) {
      const remaining = state.firstMatchPath.slice(1)
      if (isObject(this.opts.data) || isArray(this.opts.data)) {
        this.setCollapsed(false)
        if (remaining.length > 0) this.ensureChildRendered(remaining[0])
      }
      state.setFirstMatchPath(remaining.length > 0 ? remaining : null)
    }

    // Handle expandToMatch
    if (state.expandToMatch && this.expandedByClick && this.containsMatch()) {
      this.setCollapsed(false)
    }

    // Re-check visibility
    const hidden = (isPathHidden(path, state.hiddenPaths) && !state.previewHidden)
      || (this.opts.data === null && !state.showNullValues)
    this.tr.style.display = hidden ? 'none' : ''
    this.updateChildVisibility()

    this.refreshActions()
  }

  private refreshActions(): void {
    const actionsCell = this.tr.querySelector('.node-actions')
    if (!actionsCell) return
    actionsCell.innerHTML = ''
    this.buildActions(actionsCell as HTMLElement)
  }

  private containsMatch(): boolean {
    const { matches, path, data } = this.opts
    const traverse = (node: JsonValue, currentPath: Path): boolean => {
      if (isArray(node)) {
        return (node as JsonValue[]).some((item, i) =>
          isObject(item) || isArray(item)
            ? traverse(item, [...currentPath, i])
            : matches.some(m => m.path.join('/') === [...currentPath, i].join('/'))
        )
      }
      if (isObject(node)) {
        return Object.entries(node as Record<string, JsonValue>).some(([key, value]) =>
          isObject(value) || isArray(value)
            ? traverse(value, [...currentPath, key])
            : matches.some(m => m.path.join('/') === [...currentPath, key].join('/'))
        )
      }
      return matches.some(m => m.path.join('/') === currentPath.join('/'))
    }
    return traverse(data, path)
  }

  private getMatchEntry(): Match | undefined {
    return this.opts.matches.find(m => m.path.join('/') === this.opts.path.join('/'))
  }

  private isMatched(): boolean {
    return Boolean(this.getMatchEntry())
  }

  private getMatchType(): string | null {
    return this.getMatchEntry()?.matchType ?? null
  }

  private matchHighlightClass(): string {
    return this.containsMatch() && this.opts.isFiltered ? 'highlight-match' : ''
  }

  private collectDistinctValues(path: Path): JsonValue[] {
    const { originalData } = this.opts
    const traverse = (node: JsonValue, remaining: (string | number)[]): JsonValue[] => {
      if (remaining.length === 0) return Array.isArray(node) ? (node as JsonValue[]) : [node]
      const [current, ...rest] = remaining
      const generalized = getGeneralizedSegment(current)
      let results: JsonValue[] = []
      if (Array.isArray(node)) {
        node.forEach(item => { results = results.concat(traverse(item, rest)) })
      } else if (typeof node === 'object' && node !== null) {
        const obj = node as Record<string, JsonValue>
        if (obj[generalized] !== undefined) {
          results = results.concat(traverse(obj[generalized], rest))
        } else if (generalized === '*') {
          Object.keys(obj).forEach(key => { results = results.concat(traverse(obj[key], rest)) })
        }
      }
      return results
    }
    return traverse(originalData, path)
  }

  private setCollapsed(value: boolean): void {
    if (this.collapsed === value) return
    this.collapsed = value
    this.updateToggleCell()
    this.updateChildVisibility()
    this.refreshActions()
  }

  private handleToggle(altKey = false): void {
    this.deepExpand = altKey && this.collapsed
    this.expandedByClick = this.collapsed
    this.setCollapsed(!this.collapsed)
  }

  private updateToggleCell(): void {
    const valueCell = this.tr.querySelector('.node-value')
    if (!valueCell) return
    const { data } = this.opts
    if (isObject(data) || isArray(data)) {
      valueCell.innerHTML = ''
      const toggle = createNodeToggle(data, this.collapsed, this.matchHighlightClass(), isObject(data))
      toggle.addEventListener('click', (e) => {
        if (!isCollectionEmpty(data)) this.handleToggle((e as MouseEvent).altKey)
      })
      valueCell.appendChild(toggle)
    }
    this.syncChildren()
  }

  private updateChildVisibility(): void {
    const { state } = this.opts
    for (const child of this.childNodes) {
      const childHidden = (isPathHidden(child.opts.path, state.hiddenPaths) && !state.previewHidden)
        || (child.opts.data === null && !state.showNullValues)
      if (this.collapsed || childHidden) {
        child.rows.forEach(row => { row.style.display = 'none' })
      } else {
        child.tr.style.display = ''
        child.updateChildVisibility()
      }
    }
    if (this.showMoreRow) {
      this.showMoreRow.style.display = this.collapsed ? 'none' : ''
    }
  }

  private syncChildren(): void {
    if (!this.collapsed) {
      this.renderChildren()
    }
    this.updateChildVisibility()
  }

  private buildActions(cell: HTMLElement): void {
    const { state, path, data, isFiltered, parentUnfiltered } = this.opts
    const isCollection = isObject(data) || isArray(data)

    if (!state.isPatternHideMode) {
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.checked = !isPathHidden(path, state.hiddenPaths)
      cb.title = cb.checked ? 'Click to hide' : 'Click to show'
      cb.addEventListener('change', () => state.toggleHidePath(path))
      cell.appendChild(cb)
    } else {
      const eraseBtn = document.createElement('button')
      eraseBtn.className = 'btn-icon'
      eraseBtn.title = 'Hide this property everywhere (by pattern)'
      eraseBtn.innerHTML = iconEyeOff
      eraseBtn.addEventListener('click', () => {
        const pattern = path.map((seg, i) => i < path.length - 1 ? getGeneralizedSegment(seg) : seg) as HiddenPath
        state.toggleHidePath(pattern)
      })
      cell.appendChild(eraseBtn)
    }

    if (isCollection && !this.collapsed && !parentUnfiltered && isFiltered) {
      const revealBtn = document.createElement('button')
      revealBtn.className = 'btn-icon'
      revealBtn.title = this.showUnfiltered
        ? 'Show only search results'
        : `Reveal all ${isArray(data) ? 'items' : 'keys'} in this ${isArray(data) ? 'array' : 'object'}`
      revealBtn.innerHTML = this.showUnfiltered ? iconEyeFilter : iconEye
      revealBtn.addEventListener('click', () => {
        this.showUnfiltered = !this.showUnfiltered
        this.opts.state.setCollapseDepth(this.showUnfiltered ? null : this.opts.depth)
        this.rerenderChildren()
        this.refreshActions()
      })
      cell.appendChild(revealBtn)
    }

    if (this.opts.depth > 1 && !isCollection) {
      const distinctBtn = document.createElement('button')
      distinctBtn.className = 'btn-icon'
      distinctBtn.title = 'Show distinct values across all items'
      distinctBtn.innerHTML = iconBarChart
      distinctBtn.addEventListener('click', () => {
        const values = this.collectDistinctValues(path)
        const counts = countBy(values)
        const generalizedPath = path.map(getGeneralizedSegment).join('.')
        const rows = Object.keys(counts)
          .map(k => ({ name: k, count: counts[k] }))
          .sort((a, b) => a.name.localeCompare(b.name))
        const rowCount = rows.length
        const valueSum = rows.reduce((sum, r) => sum + r.count, 0)

        if (!this.dialog) {
          this.dialog = new DistinctValuesDialog(this.opts.root)
        }
        this.dialog.show(
          { title: `Distinct values for ${generalizedPath}`, data: rows },
          rowCount,
          valueSum
        )
      })
      cell.appendChild(distinctBtn)
    }
  }

  private rerenderChildren(): void {
    for (const child of this.childNodes) {
      child.destroy()
      child.rows.forEach(row => row.remove())
    }
    this.childNodes = []
    this.showMoreRow?.remove()
    this.showMoreRow = null
    this.renderedCount = 0
    this.renderChildren()
  }

  private getChildEntries(): [string | number, JsonValue][] {
    const dataToShow = this.showUnfiltered ? this.opts.getOriginalData(this.opts.path) : this.opts.data
    if (Array.isArray(dataToShow)) {
      return (dataToShow as JsonValue[])
        .map((v, i) => [i, v] as [number, JsonValue])
        .filter(([, v]) => v !== undefined)
    }
    if (typeof dataToShow === 'object' && dataToShow !== null) {
      return Object.entries(dataToShow as Record<string, JsonValue>)
        .filter(([, v]) => v !== undefined)
    }
    return []
  }

  private ensureChildRendered(childKey: string | number): void {
    const entries = this.getChildEntries()
    const targetIndex = entries.findIndex(([key]) => String(key) === String(childKey))
    if (targetIndex === -1 || targetIndex < this.renderedCount) return
    while (this.renderedCount <= targetIndex) {
      this.renderNextChunk()
    }
  }

  private renderChildren(): void {
    if (this.childNodes.length > 0) return // already rendered
    this.renderedCount = 0
    this.renderNextChunk()
  }

  private renderNextChunk(): void {
    const entries = this.getChildEntries()
    const end = Math.min(this.renderedCount + CHUNK_SIZE, entries.length)
    const { state } = this.opts

    this.showMoreRow?.remove()
    this.showMoreRow = null

    const sharedChildProps = {
      originalData: this.opts.originalData,
      matches: this.opts.matches,
      getOriginalData: this.opts.getOriginalData,
      isFiltered: this.opts.isFiltered,
      parentExpanded: this.expandedByClick,
      expandAll: this.deepExpand,
      parentUnfiltered: this.showUnfiltered || (this.opts.parentUnfiltered ?? false),
      originalIndices: this.opts.originalIndices,
      state,
      root: this.opts.root,
    }

    let lastRow = this.childNodes.length > 0
      ? this.childNodes[this.childNodes.length - 1].rows.at(-1)!
      : this.tr

    const insertAfter = (ref: HTMLTableRowElement, newRow: HTMLTableRowElement) => {
      ref.parentNode?.insertBefore(newRow, ref.nextSibling)
    }

    for (let i = this.renderedCount; i < end; i++) {
      const [key, value] = entries[i]
      const node = new TreeNode({
        ...sharedChildProps,
        name: key,
        data: cleanData(value),
        depth: this.opts.depth + 1,
        path: [...this.opts.path, key],
      })
      this.childNodes.push(node)
      node.rows.forEach(row => {
        insertAfter(lastRow, row)
        lastRow = row
      })
    }

    this.renderedCount = end

    if (this.renderedCount < entries.length) {
      const remaining = entries.length - this.renderedCount
      this.showMoreRow = document.createElement('tr')
      const td = document.createElement('td')
      td.colSpan = 3
      td.style.cssText = getIndentationStyle(this.opts.depth + 1)
      const btn = document.createElement('button')
      btn.className = 'btn btn-secondary'
      btn.textContent = `Show ${Math.min(CHUNK_SIZE, remaining)} more (${remaining} remaining)`
      btn.addEventListener('click', () => {
        this.renderNextChunk()
        this.updateChildVisibility()
      })
      td.appendChild(btn)
      this.showMoreRow.appendChild(td)
      insertAfter(lastRow, this.showMoreRow)
    }
  }

  private render(): void {
    const { data, name, depth, path, isFiltered, state } = this.opts
    const isCollection = isObject(data) || isArray(data)
    const matchEntry = this.getMatchEntry()
    const keyMatchType = this.getMatchType()

    if (matchEntry?.id) this.tr.id = matchEntry.id

    // Key cell
    const keyCell = document.createElement('td')
    const onMatchPath = isCollection && isFiltered && this.containsMatch()
    keyCell.className = `node-key${isCollectionEmpty(data) ? ' leaf' : ''}${onMatchPath ? ' on-match-path' : ''}`
    keyCell.style.cssText = getIndentationStyle(depth)
    if (!isCollectionEmpty(data)) {
      keyCell.addEventListener('click', (e) => this.handleToggle((e as MouseEvent).altKey))
    }

    const keySpan = document.createElement('span')
    if (keyMatchType && ['key', 'both'].includes(keyMatchType) && isFiltered) {
      keySpan.className = 'highlight-key'
    }
    keySpan.textContent = `${name}:`
    keyCell.appendChild(keySpan)
    this.tr.appendChild(keyCell)

    // Actions cell
    const actionsCell = document.createElement('td')
    actionsCell.className = 'node-actions'
    this.buildActions(actionsCell)
    this.tr.appendChild(actionsCell)

    // Value cell
    const valueCell = document.createElement('td')
    valueCell.className = 'node-value'

    if (!isCollection) {
      const isMatchedValue = Boolean(keyMatchType && ['value', 'both'].includes(keyMatchType))
      valueCell.appendChild(createScalarDisplay(data, isMatchedValue, isFiltered))
    } else {
      const toggle = createNodeToggle(data, this.collapsed, this.matchHighlightClass(), isObject(data))
      toggle.addEventListener('click', (e) => {
        if (!isCollectionEmpty(data)) this.handleToggle((e as MouseEvent).altKey)
      })
      valueCell.appendChild(toggle)
    }
    this.tr.appendChild(valueCell)

    // Always auto-expand root
    if (depth === 0) {
      this.setCollapsed(false)
    }

    // Sync initial visibility
    const hidden = (isPathHidden(path, state.hiddenPaths) && !state.previewHidden)
      || (data === null && !state.showNullValues)
    if (hidden) this.tr.style.display = 'none'
  }

  // Appends all rows for this node (and currently rendered children) to a table body
  appendTo(tbody: HTMLTableSectionElement): void {
    tbody.appendChild(this.tr)
    for (const child of this.childNodes) {
      child.appendTo(tbody)
    }
  }

  destroy(): void {
    this.unsubscribe?.()
    this.dialog?.destroy()
    this.showMoreRow?.remove()
    for (const child of this.childNodes) child.destroy()
  }
}
