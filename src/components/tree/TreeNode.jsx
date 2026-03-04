import { useState, useEffect } from 'react'
import { useJsonTree } from '../../context/JsonTreeContext'
import { isObject, isArray, cleanData, isCollectionEmpty, getIndentationStyle, getGeneralizedSegment } from '../../utils/json-utils'
import { isPathHidden } from '../../utils/path-utils'
import ScalarDisplay from './ScalarDisplay'
import NodeToggle from './NodeToggle'
import DistinctValuesDialog from './DistinctValuesDialog'

const countBy = (arr) => arr.reduce((acc, val) => {
  const k = String(val)
  acc[k] = (acc[k] || 0) + 1
  return acc
}, {})

const TreeNode = ({
  originalData,
  data,
  name,
  matches = [],
  depth = 0,
  path = [],
  getOriginalData,
  isFiltered,
  expandAll = false,
  parentUnfiltered = false,
  parentExpanded = false,
  originalIndices = {},
  showNullValues,
}) => {
  const {
    hiddenPaths,
    handleToggleHide,
    isPatternHideMode,
    previewHidden,
    firstMatchPath,
    setFirstMatchPath,
    collapseDepth,
    setCollapseDepth,
    expandToMatch,
  } = useJsonTree()

  const [collapsed, setCollapsed] = useState(depth > 0)
  const [deepExpand, setDeepExpand] = useState(false)
  const [expandedByClick, setExpandedByClick] = useState(parentExpanded)
  const [showUnfiltered, setShowUnfiltered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDistinctValues, setShowDistinctValues] = useState(false)
  const [distinctData, setDistinctData] = useState({ title: '', data: [] })
  const [rowCount, setRowCount] = useState(0)
  const [valueSum, setValueSum] = useState(0)

  useEffect(() => {
    if (expandAll) {
      if (isObject(data) || isArray(data)) setCollapsed(false)
      setDeepExpand(true)
    } else {
      setDeepExpand(false)
    }

    if (isObject(data) || isArray(data)) {
      if (expandToMatch && parentExpanded && containsMatch(data)) setCollapsed(false)
      if (firstMatchPath && firstMatchPath[0] === name) {
        setCollapsed(false)
        setFirstMatchPath(firstMatchPath.slice(1))
      }
    }

    setLoading(false)
  }, [expandAll, expandToMatch, firstMatchPath, loading, name, data, parentExpanded])

  useEffect(() => {
    if (isFiltered && depth === 0) setCollapsed(false)
    if (collapseDepth && depth >= collapseDepth + 1) setCollapsed(true)
  }, [depth, isFiltered, collapseDepth, data, firstMatchPath, name])

  const handleHideClick = () => {
    const pattern = path.map((seg, i) => i < path.length - 1 ? getGeneralizedSegment(seg) : seg)
    handleToggleHide(pattern)
  }

  const handleRevealClick = () => {
    setShowUnfiltered(v => !v)
    setCollapseDepth(showUnfiltered ? null : depth)
  }

  const handleToggle = (event) => {
    setLoading(true)
    setCollapsed(prev => !prev)
    setDeepExpand(event?.altKey)
    setExpandedByClick(collapsed)
    setLoading(false)
  }

  const getMatchEntry = (p) => matches.find(m => m.path.join('/') === p.join('/'))
  const isMatched = (p) => Boolean(getMatchEntry(p))
  const getMatchType = (p) => getMatchEntry(p)?.matchType ?? null

  const containsMatch = (obj) => {
    const traverse = (node, currentPath = []) => {
      if (isArray(node)) {
        return node.some((item, i) =>
          isObject(item) || isArray(item)
            ? traverse(item, [...currentPath, i])
            : isMatched([...currentPath, i])
        )
      }
      if (isObject(node)) {
        return Object.entries(node).some(([key, value]) =>
          isObject(value) || isArray(value)
            ? traverse(value, [...currentPath, key])
            : isMatched([...currentPath, key])
        )
      }
      return isMatched(currentPath)
    }
    return traverse(obj, path)
  }

  const matchHighlightClass = (obj) =>
    containsMatch(obj) && isFiltered ? 'highlight-match' : ''

  const collectDistinctValues = (data, path) => {
    const traverse = (node, remaining) => {
      if (remaining.length === 0) return Array.isArray(node) ? node : [node]
      const [current, ...rest] = remaining
      const generalized = getGeneralizedSegment(current)
      let results = []
      if (Array.isArray(node)) {
        node.forEach(item => { results = results.concat(traverse(item, rest)) })
      } else if (typeof node === 'object' && node !== null) {
        if (node[generalized] !== undefined) {
          results = results.concat(traverse(node[generalized], rest))
        } else if (generalized === '*') {
          Object.keys(node).forEach(key => { results = results.concat(traverse(node[key], rest)) })
        }
      }
      return results
    }
    return traverse(data, path)
  }

  const handleShowDistinctValues = () => {
    const values = collectDistinctValues(originalData, path)
    const counts = countBy(values)
    const generalizedPath = path.map(getGeneralizedSegment).join('.')
    const rows = Object.keys(counts)
      .map(k => ({ name: k, count: counts[k] }))
      .sort((a, b) => a.name.localeCompare(b.name))

    setDistinctData({ title: `Distinct values for ${generalizedPath}`, data: rows })
    setRowCount(rows.length)
    setValueSum(rows.reduce((sum, r) => sum + r.count, 0))
    setShowDistinctValues(true)
  }

  if (isPathHidden(path, hiddenPaths) && !previewHidden) return null

  const dataToShow = showUnfiltered ? getOriginalData(path) : data
  const matchEntry = getMatchEntry(path)
  const keyMatchType = getMatchType(path)
  const isCollection = isObject(data) || isArray(data)

  const sharedChildProps = {
    originalData,
    matches,
    getOriginalData,
    isFiltered,
    parentExpanded: expandedByClick,
    expandAll: deepExpand,
    parentUnfiltered: showUnfiltered || parentUnfiltered,
    originalIndices,
    showNullValues,
  }

  return (
    <>
      <tr id={matchEntry?.id ?? ''}>
        <td
          onClick={() => !isCollectionEmpty(data) ? handleToggle() : null}
          className={`node-key${isCollectionEmpty(data) ? ' leaf' : ''}`}
          style={getIndentationStyle(depth)}
        >
          <span className={keyMatchType && ['key', 'both'].includes(keyMatchType) && isFiltered ? 'highlight-key' : ''}>
            {name}:
          </span>
        </td>

        <td className="node-actions">
          {!isPatternHideMode ? (
            <input
              type="checkbox"
              checked={!isPathHidden(path, hiddenPaths)}
              onChange={() => handleToggleHide(path)}
              title={isPathHidden(path, hiddenPaths) ? 'Click to show' : 'Click to hide'}
            />
          ) : (
            <button className="btn-icon" onClick={handleHideClick} title="Hide by pattern">
              ⌫
            </button>
          )}

          {isCollection && !collapsed && !parentUnfiltered && isFiltered && (
            <button
              className="btn-icon"
              onClick={handleRevealClick}
              title={showUnfiltered
                ? 'Show only search results'
                : `Reveal all in this ${isArray(data) ? 'array' : 'object'}`}
            >
              {showUnfiltered ? '◑' : '○'}
            </button>
          )}

          {depth > 1 && !isCollection && (
            <button className="btn-icon" onClick={handleShowDistinctValues} title="Show distinct values">
              ≡
            </button>
          )}
        </td>

        <td className="node-value">
          {!isCollection ? (
            <ScalarDisplay
              data={data}
              isMatched={keyMatchType && ['value', 'both'].includes(keyMatchType)}
              isFiltered={isFiltered}
            />
          ) : (
            <NodeToggle
              data={data}
              collapsed={collapsed}
              handleToggle={handleToggle}
              loading={loading}
              elementClassname={matchHighlightClass(data)}
              isObjectType={isObject(data)}
            />
          )}
        </td>
      </tr>

      {!collapsed && isCollection && (
        Array.isArray(dataToShow)
          ? dataToShow.map((value, index) => {
              if (value === undefined || (value === null && !showNullValues)) return null
              return (
                <TreeNode
                  key={index}
                  name={index}
                  data={cleanData(value)}
                  depth={depth + 1}
                  path={[...path, index]}
                  {...sharedChildProps}
                />
              )
            })
          : Object.entries(dataToShow).map(([key, value]) => {
              if (value === undefined || (value === null && !showNullValues)) return null
              return (
                <TreeNode
                  key={key}
                  name={key}
                  data={cleanData(value)}
                  depth={depth + 1}
                  path={[...path, key]}
                  {...sharedChildProps}
                />
              )
            })
      )}

      <DistinctValuesDialog
        visible={showDistinctValues}
        onHide={() => setShowDistinctValues(false)}
        distinctData={distinctData}
        rowCount={rowCount}
        valueSum={valueSum}
      />
    </>
  )
}

export default TreeNode
