import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DistinctValuesDialog } from '../src/components/tree/distinct-values-dialog'

describe('DistinctValuesDialog', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })

  // ── Construction ───────────────────────────────────────────

  it('creates an overlay element in the root', () => {
    new DistinctValuesDialog(root)
    const overlay = root.querySelector('.dialog-overlay')
    expect(overlay).not.toBeNull()
    expect((overlay as HTMLElement).style.display).toBe('none')
  })

  // ── show / hide ────────────────────────────────────────────

  it('shows the overlay when show() is called', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'Test', data: [{ name: 'a', count: 1 }] }, 1, 1)
    const overlay = root.querySelector('.dialog-overlay') as HTMLElement
    expect(overlay.style.display).toBe('flex')
  })

  it('hides the overlay when hide() is called', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'Test', data: [{ name: 'a', count: 1 }] }, 1, 1)
    dialog.hide()
    const overlay = root.querySelector('.dialog-overlay') as HTMLElement
    expect(overlay.style.display).toBe('none')
  })

  it('hides when clicking the overlay', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'Test', data: [{ name: 'a', count: 1 }] }, 1, 1)
    const overlay = root.querySelector('.dialog-overlay') as HTMLElement
    overlay.click()
    expect(overlay.style.display).toBe('none')
  })

  it('hides when clicking the close button', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'Test', data: [{ name: 'a', count: 1 }] }, 1, 1)
    const closeBtn = root.querySelector('.close-btn') as HTMLElement
    closeBtn.click()
    const overlay = root.querySelector('.dialog-overlay') as HTMLElement
    expect(overlay.style.display).toBe('none')
  })

  it('does not hide when clicking the dialog body', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'Test', data: [{ name: 'a', count: 1 }] }, 1, 1)
    const dialogEl = root.querySelector('.dialog') as HTMLElement
    dialogEl.click()
    const overlay = root.querySelector('.dialog-overlay') as HTMLElement
    expect(overlay.style.display).toBe('flex')
  })

  // ── Content rendering ──────────────────────────────────────

  it('renders the title', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'Distinct values for *.name', data: [] }, 0, 0)
    expect(root.querySelector('.dialog-header span')?.textContent).toBe('Distinct values for *.name')
  })

  it('renders data rows', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({
      title: 'Test',
      data: [
        { name: 'alpha', count: 3 },
        { name: 'beta', count: 5 },
      ],
    }, 2, 8)
    const rows = root.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(rows[0].querySelector('td')?.textContent).toBe('alpha')
    expect(rows[1].querySelector('td')?.textContent).toBe('beta')
  })

  it('shows row count and value sum in headers', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({
      title: 'Test',
      data: [{ name: 'a', count: 10 }],
    }, 1, 10)
    const headers = root.querySelectorAll('th')
    expect(headers[0].textContent).toContain('(1)')
    expect(headers[1].textContent).toContain('(10)')
  })

  // ── Sorting ────────────────────────────────────────────────

  it('sorts by name ascending by default', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({
      title: 'Test',
      data: [
        { name: 'cherry', count: 1 },
        { name: 'apple', count: 3 },
        { name: 'banana', count: 2 },
      ],
    }, 3, 6)
    const cells = root.querySelectorAll('tbody tr td:first-child')
    expect(cells[0].textContent).toBe('apple')
    expect(cells[1].textContent).toBe('banana')
    expect(cells[2].textContent).toBe('cherry')
  })

  it('toggles sort direction when clicking same header', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({
      title: 'Test',
      data: [
        { name: 'a', count: 1 },
        { name: 'c', count: 3 },
        { name: 'b', count: 2 },
      ],
    }, 3, 6)
    const nameHeader = root.querySelector('th[data-sort="name"]') as HTMLElement
    nameHeader.click() // descending
    const cells = root.querySelectorAll('tbody tr td:first-child')
    expect(cells[0].textContent).toBe('c')
    expect(cells[2].textContent).toBe('a')
  })

  it('sorts by count when clicking count header', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({
      title: 'Test',
      data: [
        { name: 'a', count: 10 },
        { name: 'b', count: 1 },
        { name: 'c', count: 5 },
      ],
    }, 3, 16)
    const countHeader = root.querySelector('th[data-sort="count"]') as HTMLElement
    countHeader.click()
    const cells = root.querySelectorAll('tbody tr td:last-child')
    expect(cells[0].textContent).toBe('1')
    expect(cells[1].textContent).toBe('5')
    expect(cells[2].textContent).toBe('10')
  })

  it('shows sort arrow indicator', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'T', data: [{ name: 'a', count: 1 }] }, 1, 1)
    const nameHeader = root.querySelector('th[data-sort="name"]') as HTMLElement
    expect(nameHeader.textContent).toContain('↑')
  })

  // ── CSV export ─────────────────────────────────────────────

  it('copies CSV to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const dialog = new DistinctValuesDialog(root)
    dialog.show({
      title: 'Test',
      data: [
        { name: 'foo', count: 2 },
        { name: 'bar', count: 3 },
      ],
    }, 2, 5)

    const copyBtn = root.querySelector('.copy-btn') as HTMLButtonElement
    copyBtn.click()

    expect(writeText).toHaveBeenCalledOnce()
    const csv = writeText.mock.calls[0][0]
    expect(csv).toContain('Value,Count')
    expect(csv).toContain('"bar",3')
    expect(csv).toContain('"foo",2')
  })

  it('shows "Copied!" feedback after copying', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'T', data: [{ name: 'a', count: 1 }] }, 1, 1)

    const copyBtn = root.querySelector('.copy-btn') as HTMLButtonElement
    copyBtn.click()

    // Wait for the promise to resolve
    await vi.waitFor(() => {
      expect(copyBtn.textContent).toBe('Copied!')
    })
  })

  // ── destroy ────────────────────────────────────────────────

  it('removes the overlay from DOM on destroy', () => {
    const dialog = new DistinctValuesDialog(root)
    expect(root.querySelector('.dialog-overlay')).not.toBeNull()
    dialog.destroy()
    expect(root.querySelector('.dialog-overlay')).toBeNull()
  })

  // ── Edge cases ─────────────────────────────────────────────

  it('handles empty data', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'Empty', data: [] }, 0, 0)
    expect(root.querySelectorAll('tbody tr').length).toBe(0)
  })

  it('can be shown multiple times', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({ title: 'First', data: [{ name: 'a', count: 1 }] }, 1, 1)
    dialog.show({ title: 'Second', data: [{ name: 'b', count: 2 }, { name: 'c', count: 3 }] }, 2, 5)
    expect(root.querySelector('.dialog-header span')?.textContent).toBe('Second')
    expect(root.querySelectorAll('tbody tr').length).toBe(2)
  })

  it('resets sort state on each show', () => {
    const dialog = new DistinctValuesDialog(root)
    dialog.show({
      title: 'T',
      data: [{ name: 'z', count: 1 }, { name: 'a', count: 2 }],
    }, 2, 3)

    // Sort by count
    const countHeader = root.querySelector('th[data-sort="count"]') as HTMLElement
    countHeader.click()

    // Show again — should reset to name ascending
    dialog.show({
      title: 'T',
      data: [{ name: 'z', count: 1 }, { name: 'a', count: 2 }],
    }, 2, 3)

    const cells = root.querySelectorAll('tbody tr td:first-child')
    expect(cells[0].textContent).toBe('a')
  })
})
