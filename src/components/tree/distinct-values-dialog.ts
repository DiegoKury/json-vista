interface DistinctRow {
  name: string
  count: number
}

interface DistinctData {
  title: string
  data: DistinctRow[]
}

export class DistinctValuesDialog {
  private overlay: HTMLElement
  private sortField: keyof DistinctRow = 'name'
  private sortDir = 1
  private rows: DistinctRow[] = []
  private rowCount = 0
  private valueSum = 0

  constructor(private root: ShadowRoot | HTMLElement) {
    this.overlay = document.createElement('div')
    this.overlay.className = 'dialog-overlay'
    this.overlay.style.display = 'none'
    this.overlay.addEventListener('click', () => this.hide())
    this.root.appendChild(this.overlay)
  }

  show(distinctData: DistinctData, rowCount: number, valueSum: number): void {
    this.rows = distinctData.data
    this.rowCount = rowCount
    this.valueSum = valueSum
    this.sortField = 'name'
    this.sortDir = 1
    this.overlay.style.display = 'flex'
    this.render(distinctData.title)
  }

  hide(): void {
    this.overlay.style.display = 'none'
  }

  private render(title: string): void {
    const sorted = [...this.rows].sort((a, b) => {
      if (a[this.sortField] < b[this.sortField]) return -this.sortDir
      if (a[this.sortField] > b[this.sortField]) return this.sortDir
      return 0
    })

    const arrow = (field: keyof DistinctRow) =>
      this.sortField === field ? (this.sortDir === 1 ? ' ↑' : ' ↓') : ''

    this.overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-header">
          <span>${title}</span>
          <button class="btn-icon close-btn" title="Close">✕</button>
        </div>
        <table>
          <thead>
            <tr>
              <th data-sort="name">Value (${this.rowCount})${arrow('name')}</th>
              <th data-sort="count">Count (${this.valueSum})${arrow('count')}</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(row => `<tr><td>${row.name}</td><td>${row.count}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="dialog-footer">
          <button class="btn copy-btn">Copy to CSV</button>
        </div>
      </div>
    `

    this.overlay.querySelector('.close-btn')!.addEventListener('click', (e) => {
      e.stopPropagation()
      this.hide()
    })

    this.overlay.querySelector('.copy-btn')!.addEventListener('click', (e) => {
      e.stopPropagation()
      const csv = ['Value,Count', ...sorted.map(r => `"${r.name}",${r.count}`)].join('\n')
      navigator.clipboard.writeText(csv).then(() => {
        const btn = this.overlay.querySelector('.copy-btn') as HTMLButtonElement
        btn.textContent = 'Copied!'
        setTimeout(() => { btn.textContent = 'Copy to CSV' }, 2000)
      })
    })

    this.overlay.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', (e) => {
        e.stopPropagation()
        const field = (th as HTMLElement).dataset.sort as keyof DistinctRow
        if (this.sortField === field) {
          this.sortDir = -this.sortDir
        } else {
          this.sortField = field
          this.sortDir = 1
        }
        this.render(title)
      })
    })

    const dialog = this.overlay.querySelector('.dialog')!
    dialog.addEventListener('click', e => e.stopPropagation())
  }

  destroy(): void {
    this.overlay.remove()
  }
}
