import type { JsonValue } from '../../types'
import { isCollectionEmpty } from '../../utils/utils'

const chevronRight = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`
const chevronDown = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`

export function createNodeToggle(data: JsonValue, collapsed: boolean, matchClass: string, isObjectType: boolean): HTMLElement {
  const empty = isCollectionEmpty(data)
  const div = document.createElement('div')
  div.className = `node-toggle${!empty ? ' clickable' : ''}`

  if (collapsed) {
    if (empty) {
      div.textContent = isObjectType ? '{}' : '[]'
    } else {
      div.innerHTML = `<span class="${matchClass}">${chevronRight} ${isObjectType ? '{...}' : '[...]'}</span>`
    }
  } else {
    div.innerHTML = `<span class="${matchClass}">${chevronDown} <em>${isObjectType ? 'object' : 'array'}</em></span>`
  }

  return div
}
