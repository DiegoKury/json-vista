import { describe, it, expect, vi } from 'vitest'

vi.mock('../styles/index.css?raw', () => ({ default: '' }))

describe('public API exports', () => {
  it('exports JsonVista class', async () => {
    const mod = await import('../src/index')
    expect(mod.JsonVista).toBeDefined()
    expect(typeof mod.JsonVista).toBe('function')
  })

  it('JsonVista is a custom element constructor', async () => {
    const mod = await import('../src/index')
    expect(mod.JsonVista.prototype).toBeInstanceOf(HTMLElement)
  })
})
