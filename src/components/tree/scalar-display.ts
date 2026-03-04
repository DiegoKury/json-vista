import type { JsonValue } from '../../types'

export function createScalarDisplay(data: JsonValue, isMatched: boolean, isFiltered: boolean): HTMLElement {
  const span = document.createElement('span')
  span.className = `scalar-${typeof data}${isMatched && isFiltered ? ' highlight-match' : ''}`
  span.textContent = JSON.stringify(data)
  return span
}
