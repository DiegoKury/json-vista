import type { JsonValue, Path, Match, HiddenPath } from '../../types'
import type { State } from '../../state'
import { isObject, isArray, isCollectionEmpty, cleanData, getIndentationStyle, getGeneralizedSegment } from '../../utils/utils'
import { isPathHidden } from '../../utils/path-utils'
import { createScalarDisplay } from './scalar-display'
import { createNodeToggle } from './node-toggle'
import { DistinctValuesDialog } from './distinct-values-dialog'

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
  showNullValues?: boolean
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

  private opts: TreeNodeOptions

  constructor(opts: TreeNodeOptions) {
    this.opts = opts
    this.collapsed = opts.depth > 0
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
    return result
  }

  private onStateChange(): void {
    const { state, path } = this.opts

    // Handle collapseDepth
    if (state.collapseDepth !== null && this.opts.depth >= state.collapseDepth + 1) {
      this.setCollapsed(true)
    }

    // Handle firstMatchPath auto-expand
    if (
      (isObject(this.opts.data) || isArray(this.opts.data)) &&
      state.firstMatchPath &&
      state.firstMatchPath[0] === this.opts.name
    ) {
      this.setCollapsed(false)
      state.setFirstMatchPath(state.firstMatchPath.slice(1))
    }

    // Handle expandToMatch
    if (state.expandToMatch && this.expandedByClick && this.containsMatch()) {
      this.setCollapsed(false)
    }

    // Re-check visibility
    const hidden = isPathHidden(path, state.hiddenPaths)
    this.tr.style.display = hidden && !state.previewHidden ? 'none' : ''
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
  }

  private handleToggle(altKey = false): void {
    this.deepExpand = altKey && this.collapsed
    this.expandedByClick = this.collapsed
    this.setCollapsed(!this.collapsed)
  }

  private updateToggleCell(): void {
    const valueCell = this.tr.querySelector('.node-value')
    if (!valueCell) return
    const { data, isFiltered } = this.opts
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
    for (const child of this.childNodes) {
      const childHidden = isPathHidden(child.opts.path, this.opts.state.hiddenPaths) && !this.opts.state.previewHidden
      const parentCollapsed = this.collapsed
      child.rows.forEach(row => {
        row.style.display = parentCollapsed || childHidden ? 'none' : ''
      })
      if (!parentCollapsed) child.updateChildVisibility()
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
      eraseBtn.title = 'Hide by pattern'
      eraseBtn.textContent = '⌫'
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
        : `Reveal all in this ${isArray(data) ? 'array' : 'object'}`
      revealBtn.textContent = this.showUnfiltered ? '◑' : '○'
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
      distinctBtn.title = 'Show distinct values'
      distinctBtn.textContent = '≡'
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
    this.renderChildren()
  }

  private renderChildren(): void {
    if (this.childNodes.length > 0) return // already rendered

    const { data, state, originalIndices, showNullValues } = this.opts
    const dataToShow = this.showUnfiltered ? this.opts.getOriginalData(this.opts.path) : data

    const insertAfter = (ref: HTMLTableRowElement, newRow: HTMLTableRowElement) => {
      ref.parentNode?.insertBefore(newRow, ref.nextSibling)
    }

    let lastRow = this.tr

    const sharedChildProps = {
      originalData: this.opts.originalData,
      matches: this.opts.matches,
      getOriginalData: this.opts.getOriginalData,
      isFiltered: this.opts.isFiltered,
      parentExpanded: this.expandedByClick,
      expandAll: this.deepExpand,
      parentUnfiltered: this.showUnfiltered || (this.opts.parentUnfiltered ?? false),
      originalIndices: this.opts.originalIndices,
      showNullValues: this.opts.showNullValues,
      state,
      root: this.opts.root,
    }

    const insertChild = (node: TreeNode) => {
      this.childNodes.push(node)
      node.rows.forEach(row => {
        insertAfter(lastRow, row)
        lastRow = row
      })
    }

    if (Array.isArray(dataToShow)) {
      (dataToShow as JsonValue[]).forEach((value, index) => {
        if (value === undefined || (value === null && !showNullValues)) return
        insertChild(new TreeNode({
          ...sharedChildProps,
          name: index,
          data: cleanData(value),
          depth: this.opts.depth + 1,
          path: [...this.opts.path, index],
        }))
      })
    } else if (typeof dataToShow === 'object' && dataToShow !== null) {
      Object.entries(dataToShow as Record<string, JsonValue>).forEach(([key, value]) => {
        if (value === undefined || (value === null && !showNullValues)) return
        insertChild(new TreeNode({
          ...sharedChildProps,
          name: key,
          data: cleanData(value),
          depth: this.opts.depth + 1,
          path: [...this.opts.path, key],
        }))
      })
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
    keyCell.className = `node-key${isCollectionEmpty(data) ? ' leaf' : ''}`
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

    // Handle depth-0 auto-expand when filtered
    if (isFiltered && depth === 0) {
      this.setCollapsed(false)
    }

    // Sync initial state
    const hidden = isPathHidden(path, state.hiddenPaths) && !state.previewHidden
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
    for (const child of this.childNodes) child.destroy()
  }
}
