import type { HiddenPath, Path, Match } from './types'
import { pathsAreEqual } from './utils/path-utils'

export class State {
  hiddenPaths: HiddenPath[] = []
  isPatternHideMode = true
  previewHidden = false
  expandToMatch = false
  collapseDepth: number | null = null
  firstMatchPath: Path | null = null
  showNullValues = false

  private listeners = new Set<() => void>()

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem('hiddenPaths') || '[]')
      const session = JSON.parse(sessionStorage.getItem('hideProps') || '[]')
      this.hiddenPaths = [
        ...new Set([
          ...(Array.isArray(saved) ? saved : []),
          ...(Array.isArray(session) ? session : []),
        ]),
      ] as HiddenPath[]
      sessionStorage.removeItem('hideProps')
    } catch {
      // ignore storage errors
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify(): void {
    this.listeners.forEach(fn => fn())
  }

  setHiddenPaths(paths: HiddenPath[]): void {
    this.hiddenPaths = paths
    try { localStorage.setItem('hiddenPaths', JSON.stringify(paths)) } catch {}
    this.notify()
  }

  toggleHidePath(pathPattern: HiddenPath): void {
    const index = this.hiddenPaths.findIndex(p => pathsAreEqual(p, pathPattern))
    this.setHiddenPaths(
      index >= 0
        ? this.hiddenPaths.filter((_, i) => i !== index)
        : [...this.hiddenPaths, pathPattern]
    )
  }

  resetHiddenPaths(): void {
    this.setHiddenPaths([])
  }

  toggleHideMode(): void {
    this.previewHidden = !this.previewHidden
    this.isPatternHideMode = !this.isPatternHideMode
    this.notify()
  }

  setExpandToMatch(value: boolean): void {
    this.expandToMatch = value
    this.notify()
  }

  setCollapseDepth(depth: number | null): void {
    this.collapseDepth = depth
    this.notify()
  }

  setFirstMatchPath(path: Path | null): void {
    this.firstMatchPath = path
    this.notify()
  }

  setShowNullValues(value: boolean): void {
    this.showNullValues = value
    this.notify()
  }

  // Called after a search, sets up state for match navigation
  applySearchResults(matches: Match[], firstMatchPath: Path | null): void {
    this.firstMatchPath = firstMatchPath
    this.expandToMatch = false
    this.notify()
  }
}
