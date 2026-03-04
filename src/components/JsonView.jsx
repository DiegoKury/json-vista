import { useState, useCallback } from 'react'
import { useJsonTree } from '../context/JsonTreeContext'
import JsonSearch from './JsonSearch'
import TreeNode from './tree/TreeNode'

export default function JsonView({ data: initialData, cacheEntry }) {
  const {
    resetHiddenPaths,
    isPatternHideMode,
    toggleHideMode,
    setFirstMatchPath,
    expandToMatch,
    setExpandToMatch,
  } = useJsonTree()

  const [displayData, setDisplayData] = useState(initialData)
  const [matches, setMatches] = useState([])
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [originalIndices, setOriginalIndices] = useState(null)
  const [isFiltered, setIsFiltered] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSorted, setIsSorted] = useState(false)
  const [showNullValues, setShowNullValues] = useState(false)

  const getOriginalData = useCallback(
    (path) => path.reduce((data, key) => data?.[key], initialData),
    [initialData]
  )

  const onFilter = (filteredData, newMatches, newMatchCount, newOriginalIndices) => {
    setDisplayData(filteredData)
    setMatches(newMatches)
    setMatchCount(newMatchCount)
    setIsFiltered(true)
    setExpandToMatch(false)
    setFirstMatchPath(findFirstMatchPath(initialData, newMatches, newOriginalIndices))
    setOriginalIndices(newOriginalIndices)
  }

  const findFirstMatchPath = (obj, matched, indices, path = []) => {
    if (matched.some(m => m.path.join('/') === path.join('/'))) return path
    if (typeof obj !== 'object' || obj === null) return null
    for (const [key, value] of Object.entries(obj)) {
      const nextPath = Array.isArray(obj)
        ? [...path, indices?.[path.concat(key).join('/')] ?? key]
        : [...path, key]
      const result = findFirstMatchPath(value, matched, indices, nextPath)
      if (result) return result
    }
    return null
  }

  const clearSearch = () => {
    setDisplayData(initialData)
    setMatches([])
    setMatchCount(0)
    setOriginalIndices(null)
    setIsFiltered(false)
    setIsSorted(false)
    resetHiddenPaths()
    setFirstMatchPath(null)
    setSearchTerm('')
  }

  const sortData = () => {
    const sort = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj
      if (Array.isArray(obj)) return obj.map(sort)
      return Object.keys(obj).sort().reduce((acc, key) => { acc[key] = sort(obj[key]); return acc }, {})
    }
    setDisplayData(sort(displayData))
    setIsSorted(true)
  }

  const nextMatch = () => {
    if (!matches.length) return
    const nextIndex = (currentMatchIndex + 1) % matches.length
    document.getElementById(matches[nextIndex].id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setCurrentMatchIndex(nextIndex)
  }

  return (
    <div className="json-explorer">
      {cacheEntry && (
        <div className="source-header">
          <span>{cacheEntry.name ?? cacheEntry.url}</span>
          {cacheEntry.origin_url && (
            <a href={cacheEntry.origin_url} target="_blank" rel="noopener noreferrer" title="Open source URL">↗</a>
          )}
        </div>
      )}

      <div className="card">
        <JsonSearch
          data={initialData}
          originalData={initialData}
          onFilter={onFilter}
          onClear={clearSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isFiltered={isFiltered}
          setIsFiltered={setIsFiltered}
        />

        <div className="toolbar">
          <button className="btn btn-secondary" onClick={sortData} disabled={isSorted}>
            {isSorted ? 'Sorted A→Z' : 'Sort A→Z'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowNullValues(v => !v)}>
            {showNullValues ? 'Hide nulls' : 'Show nulls'}
          </button>
          <button className="btn" onClick={toggleHideMode}>
            {isPatternHideMode ? 'Edit visibility' : 'Done'}
          </button>
          {!isPatternHideMode && (
            <button className="btn btn-danger" onClick={resetHiddenPaths}>Reset hidden</button>
          )}
          {isFiltered && (
            <>
              <button className="btn" onClick={nextMatch}>Next match</button>
              <button
                className="btn"
                onClick={() => setExpandToMatch(v => !v)}
                title={expandToMatch ? 'Cancel expand' : 'Expand tree to show all matches'}
              >
                {expandToMatch ? 'Cancel expand' : 'Expand matches'}
              </button>
              <span className="match-count">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>
            </>
          )}
        </div>

        <table className="json-tree">
          <tbody>
            <TreeNode
              originalData={initialData}
              data={displayData}
              name="root"
              matches={matches}
              getOriginalData={getOriginalData}
              depth={0}
              path={[]}
              originalIndices={originalIndices}
              isFiltered={isFiltered}
              parentExpanded={false}
              parentUnfiltered={false}
              showNullValues={showNullValues}
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}
