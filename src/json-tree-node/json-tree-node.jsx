import _ from 'lodash'
import React, { useState, useEffect, useRef } from 'react'
import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { useJsonTree } from '../lib/context/json-tree-context.jsx'
import {
  isObject,
  isArray,
  cleanData,
  isCollectionEmpty,
  getIndentationStyle,
  getGeneralizedSegment,
} from '../lib/utils/json-utils'
import { isPathHidden } from '../lib/utils/path-utils'
import ScalarValue from './scalar-value.jsx'
import ToggleButton from './toggle-button.jsx'
import DistinctValuesDialog from './distinct-values-dialog.jsx'
import '../../styles/json-view-renderer.css'

const JsonTreeNode = ({
  originalData,
  data,
  name,
  matchedElements = [],
  onNavigate,
  depth = 0,
  parentDataLength,
  path = [],
  getParentOriginalData,
  navigateUp,
  isRoot,
  searchPerformed,
  forceExpand = false,
  isParentOriginal = false,
  parentClicked = false,
  originalIndices = {},
  keySearchPerformed,
  showNullValues,
}) => {
  const {
    hiddenPaths,
    handleToggleHide,
    isEditingHidden,
    showAllHiddenTemporarily,
    firstMatchPath,
    setFirstMatchPath,
    collapseDepth,
    handleToggleCollapseDepth,
    expandToMatch,
  } = useJsonTree()

  const [collapsed, setCollapsed] = useState(depth > 0)
  const [expandRecursively, setExpandRecursively] = useState(false)
  const [clicked, setClicked] = useState(parentClicked)
  const [isOriginal, setIsOriginal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDistinctValues, setShowDistinctValues] = useState(false)
  const [cardData, setCardData] = useState({ title: '', data: [] })
  const [rowCount, setRowCount] = useState(0)
  const [valueSum, setValueSum] = useState(0)
  const toast = useRef(null)

  const nodeId = path.join('/')

  useEffect(() => {
    if (forceExpand) {
      if (isObject(data) || isArray(data)) {
        setCollapsed(false)
      }
      setExpandRecursively(true)
    } else {
      setExpandRecursively(false)
    }
    if (isObject(data) || isArray(data)) {
      if (expandToMatch && parentClicked && containsMatchedScalar(data)) {
        setCollapsed(false)
      }
      if (firstMatchPath && firstMatchPath[0] === name) {
        setCollapsed(false)
        setFirstMatchPath(firstMatchPath.slice(1))
      }
    }
    setLoading(false)
  }, [forceExpand, expandToMatch, firstMatchPath, loading, name, data, parentClicked])

  useEffect(() => {
    if (searchPerformed && depth === 0) {
      setCollapsed(false)
    }
    if (collapseDepth && depth >= collapseDepth + 1) {
      setCollapsed(true)
    }
  }, [depth, searchPerformed, collapseDepth, data, firstMatchPath, name])

  const handleHideClick = () => {
    let pattern = path.map((segment, i) => {
      if (i < path.length - 1) {
        return getGeneralizedSegment(segment)
      } else {
        return segment
      }
    })
    handleToggleHide(pattern)
  }

  const handleEyeClick = () => {
    setIsOriginal(!isOriginal)
    if (!isOriginal) {
      handleToggleCollapseDepth(depth)
    } else {
      handleToggleCollapseDepth(null)
    }
  }

  const handleToggle = (event) => {
    setLoading(true)
    setCollapsed((prev) => !prev)
    setExpandRecursively(event?.altKey)
    setClicked(collapsed)
    setLoading(false)
  }

  const isMatched = (currentPath) => {
    return matchedElements.some((match) => match.path.join('/') === currentPath.join('/'))
  }

  const getMatchType = (currentPath) => {
    const match = matchedElements.find((match) => match.path.join('/') === currentPath.join('/'))
    return match ? match.matchType : null
  }

  const containsMatchedScalar = (obj) => {
    const traverse = (node, currentPath = []) => {
      if (isArray(node)) {
        return node.some((item, index) =>
          isObject(item) || isArray(item)
            ? traverse(item, [...currentPath, index])
            : isMatched([...currentPath, index])
        )
      } else if (isObject(node)) {
        return Object.entries(node).some(([key, value]) =>
          isObject(value) || isArray(value)
            ? traverse(value, [...currentPath, key])
            : isMatched([...currentPath, key])
        )
      } else {
        return isMatched(currentPath)
      }
    }
    return traverse(obj, path)
  }

  const elementClassname = (obj) => {
    return containsMatchedScalar(obj) && searchPerformed ? 'bg-blue-200' : ''
  }

  const determineEyeTooltip = () => {
    if (isOriginal) {
      return 'Cloak properties which are not part of the search ancestry'
    } else {
      return isArray(data)
        ? 'Reveal cloaked properties inside this array'
        : 'Reveal cloaked properties inside this object'
    }
  }

  const dataToShow = isOriginal ? getParentOriginalData(path) : data
  const indentation = getIndentationStyle(depth)

  const getDistinctValues = (data, path) => {
    const traverse = (node, remainingPath) => {
      if (remainingPath.length === 0) {
        return Array.isArray(node) ? node : [node]
      }

      const [current, ...rest] = remainingPath
      const generalizedCurrent = getGeneralizedSegment(current)

      let results = []

      if (Array.isArray(node)) {
        node.forEach((item) => {
          results = results.concat(traverse(item, rest))
        })
      } else if (typeof node === 'object' && node !== null) {
        if (node[generalizedCurrent] !== undefined) {
          results = results.concat(traverse(node[generalizedCurrent], rest))
        } else if (generalizedCurrent === '*') {
          Object.keys(node).forEach((key) => {
            results = results.concat(traverse(node[key], rest))
          })
        }
      }

      return results
    }

    const allValues = traverse(data, path)
    return allValues
  }

  const handleShowDistinctValues = () => {
    const values = getDistinctValues(originalData, path)
    const distinctData = _.countBy(values)
    const generalizedPath = path.map((segment) => getGeneralizedSegment(segment)).join('.')

    let data = Object.keys(distinctData).map((key) => ({ name: key, count: distinctData[key] }))
    data = _.sortBy(data, ['name'])

    setCardData({
      title: `Distinct values for ${generalizedPath}`,
      data: data,
    })
    setRowCount(data.length)
    setValueSum(data.reduce((sum, item) => sum + item.count, 0))
    setShowDistinctValues(true)
  }

  const convertToCSV = (data) => {
    const headers = ['Value', 'Count']
    const rows = data.map((item) => [`"${item.name}"`, item.count])

    let csvContent = headers.join(',') + '\n' + rows.map((e) => e.join(',')).join('\n')
    return csvContent
  }

  const handleCopyToClipboard = () => {
    const csvContent = convertToCSV(cardData.data)
    navigator.clipboard.writeText(csvContent).then(() => {
      toast.current.show({
        severity: 'success',
        summary: 'Copied to Clipboard',
        detail: 'The CSV data has been copied to your clipboard.',
      })
    })
  }

  if (isPathHidden(path, hiddenPaths) && !showAllHiddenTemporarily) {
    return null
  }

  return (
    <>
      <tr id={matchedElements.some(m => m.path.join('/') === path.join('/')) ? matchedElements.find(m => m.path.join('/') === path.join('/')).id : ''}>
        <td
          onClick={() => (!isCollectionEmpty(data) ? handleToggle() : null)}
          className={`node-indentation ${!isCollectionEmpty(data) ? 'clickable' : ''}`}
          style={indentation}
        >
          <span
            className={
              getMatchType(path) && ['key', 'both'].includes(getMatchType(path)) && searchPerformed
                ? 'bg-gray-300'
                : ''
            }
          >
            {name}:
          </span>
        </td>
        <td>
          <div className="button-row">
            {!isEditingHidden ? (
              <Checkbox
                checked={!isPathHidden(path, hiddenPaths)}
                onChange={() => handleToggleHide(path)}
                tooltip={isPathHidden(path, hiddenPaths) ? 'Click to show' : 'Click to hide'}
                tooltipOptions={{ showDelay: 1000 }}
              />
            ) : (
              <Button
                icon="pi pi-eraser"
                className="button-opacity p-button-rounded p-button-text p-button-plain"
                style={{ padding: '0.2em', height: '1.5em' }}
                onClick={handleHideClick}
                tooltip="Hide Property"
                tooltipOptions={{ showDelay: 1000 }}
              />
            )}
            {isObject(data) || isArray(data) ? (
              !collapsed && !isParentOriginal && searchPerformed && (
                <Button
                  icon={isOriginal ? 'pi pi-eye-slash' : 'pi pi-eye'}
                  className="button-opacity p-button-rounded p-button-text p-button-plain"
                  style={{ padding: '0.2em', height: '1.5em' }}
                  onClick={handleEyeClick}
                  tooltip={determineEyeTooltip()}
                  tooltipOptions={{ showDelay: 1000 }}
                />
              )
            ) : null}
            {depth > 1 && !isObject(data) && !isArray(data) && (
              <Button
                icon="pi pi-list"
                className="p-button-rounded p-button-text p-button-plain"
                style={{ padding: '0.2em', height: '1.5em' }}
                onClick={handleShowDistinctValues}
                tooltip="Show Distinct Values"
                tooltipOptions={{ showDelay: 1000 }}
              />
            )}
          </div>
        </td>
        <td>
          {!isObject(data) && !isArray(data) ? (
            <div className="scalar-container">
              <ScalarValue
                data={data}
                path={path}
                isMatched={
                  getMatchType(path) && ['value', 'both'].includes(getMatchType(path)) && searchPerformed
                }
                searchPerformed={searchPerformed}
              />
            </div>
          ) : (
            <ToggleButton
              data={data}
              collapsed={collapsed}
              handleToggle={handleToggle}
              loading={loading}
              elementClassname={elementClassname(data)}
              isObjectType={isObject(data)}
              depth={depth}
            />
          )}
        </td>
      </tr>
      {!collapsed &&
        (isObject(data) || isArray(data)) &&
        (Array.isArray(dataToShow)
          ? dataToShow.map((value, index) => {
              if (value === undefined || (value === null && !showNullValues)) {
                return null // Skip filtered out items
              }
              return (
                <JsonTreeNode
                  key={index}
                  name={index}
                  originalData={originalData}
                  data={cleanData(value)}
                  depth={depth + 1}
                  path={[...path, index]}
                  parentDataLength={dataToShow.length}
                  onNavigate={onNavigate}
                  matchedElements={matchedElements}
                  getParentOriginalData={getParentOriginalData}
                  searchPerformed={searchPerformed}
                  parentClicked={clicked}
                  forceExpand={expandRecursively}
                  isParentOriginal={isOriginal || isParentOriginal}
                  originalIndices={originalIndices}
                  showNullValues={showNullValues}
                />
              )
            })
          : Object.entries(dataToShow).map(([key, value]) => {
              if (value === undefined || (value === null && !showNullValues)) {
                return null // Skip filtered out items
              }
              return (
                <JsonTreeNode
                  key={key}
                  name={key}
                  originalData={originalData}
                  data={cleanData(value)}
                  depth={depth + 1}
                  path={[...path, key]}
                  parentDataLength={Object.keys(dataToShow).length}
                  onNavigate={onNavigate}
                  matchedElements={matchedElements}
                  getParentOriginalData={getParentOriginalData}
                  searchPerformed={searchPerformed}
                  parentClicked={clicked}
                  forceExpand={expandRecursively}
                  isParentOriginal={isOriginal || isParentOriginal}
                  originalIndices={originalIndices}
                  showNullValues={showNullValues}
                />
              )
            }))}
      <DistinctValuesDialog
        visible={showDistinctValues}
        onHide={() => setShowDistinctValues(false)}
        cardData={cardData}
        handleCopyToClipboard={handleCopyToClipboard}
        toast={toast}
        rowCount={rowCount}
        valueSum={valueSum}
      />
    </>
  )
}

export default JsonTreeNode
