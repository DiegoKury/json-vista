import { useState } from 'react'

const DistinctValuesDialog = ({ visible, onHide, distinctData, rowCount, valueSum }) => {
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState(1)
  const [copied, setCopied] = useState(false)

  if (!visible) return null

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => -d)
    } else {
      setSortField(field)
      setSortDir(1)
    }
  }

  const sorted = [...distinctData.data].sort((a, b) => {
    if (a[sortField] < b[sortField]) return -sortDir
    if (a[sortField] > b[sortField]) return sortDir
    return 0
  })

  const copyToCSV = () => {
    const csv = ['Value,Count', ...sorted.map(r => `"${r.name}",${r.count}`)].join('\n')
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const sortArrow = (field) => sortField === field ? (sortDir === 1 ? ' ↑' : ' ↓') : ''

  return (
    <div className="dialog-overlay" onClick={onHide}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <span>{distinctData.title}</span>
          <button className="btn-icon" onClick={onHide} title="Close">✕</button>
        </div>
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('name')}>Value ({rowCount}){sortArrow('name')}</th>
              <th onClick={() => toggleSort('count')}>Count ({valueSum}){sortArrow('count')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="dialog-footer">
          <button className="btn" onClick={copyToCSV}>Copy to CSV</button>
          {copied && <span className="copy-feedback">Copied!</span>}
        </div>
      </div>
    </div>
  )
}

export default DistinctValuesDialog
