'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { useJsonTree } from './lib/context/json-tree-context.jsx'
import JsonSearch from './json-search.jsx'
import JsonViewRenderer from './json-view-renderer.jsx'

export default function JsonView({ data: initialData, cacheEntry }) {
  const {
    resetHiddenPaths,
    isEditingHidden,
    toggleEditingHidden,
    setFirstMatchPath,
    expandToMatch,
    setExpandToMatch,
    hiddenPaths,
    collapseDepth,
    firstMatchPath,
    showAllHiddenTemporarily,
    setHiddenPaths,
    setCollapseDepth,
    setShowAllHiddenTemporarily,
  } = useJsonTree()

  const [navigatedOriginalData, setNavigatedOriginalData] = useState(initialData)
  const [rootData, setRootData] = useState(initialData)
  const [currentRoot, setCurrentRoot] = useState(initialData)
  const [navigationPath, setNavigationPath] = useState([{ name: 'root', data: initialData }])
  const [matchedElements, setMatchedElements] = useState([])
  const [matchedCount, setMatchedCount] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [originalIndices, setOriginalIndices] = useState(null)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [keySearchPerformed, setKeySearchPerformed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSorted, setIsSorted] = useState(false)
  const [showNullValues, setShowNullValues] = useState(false)

  useEffect(() => {
    if (window.location.hash) {
      const element = document.getElementById(window.location.hash.substring(1))
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      }
    }
  }, [currentMatchIndex])  

  const onDataFiltered = (
    filteredData,
    matchedElements,
    matchedCount,
    originalIndices,
    isKeySearchEnabled
  ) => {
    setRootData(filteredData)
    setMatchedElements(matchedElements)
    setMatchedCount(matchedCount)
    setSearchPerformed(true)
    setExpandToMatch(false)
    setFirstMatchPath(findFirstMatchPath(initialData, matchedElements, originalIndices))
    setOriginalIndices(originalIndices)
    setKeySearchPerformed(isKeySearchEnabled)
  }

  const findFirstMatchPath = (obj, matchedElements, originalIndices, path = []) => {
    const currentPathStr = path.join('/')
    if (matchedElements.some((match) => match.path.join('/') === currentPathStr)) {
      return path
    } else if (typeof obj === 'object' && obj !== null) {
      for (let [key, value] of Object.entries(obj)) {
        let result
        if (Array.isArray(obj)) {
          const originalIndex = originalIndices?.[path.concat(key).join('/')]
          result = findFirstMatchPath(value, matchedElements, originalIndices, [...path, originalIndex])
        } else {
          result = findFirstMatchPath(value, matchedElements, originalIndices, [...path, key])
        }
        if (result) {
          return result
        }
      }
    }
    return null
  }

  const handleNavigate = (newRoot, newName) => {
    const newPath = [...navigationPath, { name: newName, data: newRoot }]
    setNavigationPath(newPath)
    setRootData(newRoot)
    setCurrentRoot(newRoot)
    const newNavigatedOriginalData = newPath.slice(1).reduce((acc, step) => {
      return acc[step.name] || acc
    }, initialData)
    setNavigatedOriginalData(newNavigatedOriginalData)
  }

  const handleBreadcrumbNavigate = useCallback(
    (index) => {
      const newPath = navigationPath.slice(0, index + 1)
      setNavigationPath(newPath)

      const newRoot = newPath.slice(-1)[0].data
      setRootData(newRoot)
      setCurrentRoot(newRoot)
      setSearchPerformed(false)

      const newNavigatedOriginalData = newPath.slice(1).reduce(
        (acc, step) => acc[step.name] || acc,
        initialData
      )
      setNavigatedOriginalData(newNavigatedOriginalData)
    },
    [navigationPath, initialData]
  )

  const handleNavigateUp = () => {
    if (navigationPath.length > 1) {
      const newPath = navigationPath.slice(0, -1)
      setNavigationPath(newPath)
      const newRoot = newPath[newPath.length - 1].data
      setRootData(newRoot)
      setCurrentRoot(newRoot)
      setSearchPerformed(false)

      const newNavigatedOriginalData = newPath
        .slice(1)
        .reduce((acc, step) => acc[step.name] || acc, initialData)
      setNavigatedOriginalData(newNavigatedOriginalData)
    }
  }

  const getParentOriginalData = (path) => {
    return path.reduce((data, key) => {
      return data?.[key]
    }, navigatedOriginalData)
  }

  const breadcrumbItems = useMemo(() => {
    return navigationPath.map((step, index) => ({
      label: step.name,
      command: () => handleBreadcrumbNavigate(index),
    }))
  }, [navigationPath, handleBreadcrumbNavigate])

  const handleClearSearch = () => {
    setRootData(initialData)
    setCurrentRoot(initialData)
    setMatchedElements([])
    setMatchedCount(0)
    setOriginalIndices(null)
    setSearchPerformed(false)
    resetHiddenPaths()
    setNavigationPath([{ name: 'root', data: initialData }])
    setFirstMatchPath(null)
    setSearchTerm('')
  }

  const handleSortRootData = () => {
    const sortedData = sortObject(rootData)
    setRootData(sortedData)
    setIsSorted(true)
  }

  const sortObject = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(sortObject)
      } else {
        return Object.keys(obj)
          .sort()
          .reduce((sorted, key) => {
            sorted[key] = sortObject(obj[key])
            return sorted
          }, {})
      }
    }
    return obj
  }

  const goToNextMatch = () => {
    if (matchedElements.length > 0) {
      const nextIndex = (currentMatchIndex + 1) % matchedElements.length
      const nextMatchId = matchedElements[nextIndex].id
      window.location.hash = nextMatchId
      setCurrentMatchIndex(nextIndex)
    }
  }

  return (
    <div className="overflow-auto p-2">
      <Card
        className="p-1 bg-slate-100 w-1/3 rounded flex flex-col justify-center mb-4"
        style={{ height: '40px' }}
      >
        <div className="flex items-center">
          <h1 className="text-sm font-bold">{cacheEntry.name ?? cacheEntry.url}</h1>
          {cacheEntry.origin_url && (
            <a
              href={cacheEntry.origin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2"
            >
              <i className="pi pi-external-link" style={{ cursor: 'pointer' }}></i>
            </a>
          )}
        </div>
      </Card>
      <Card className="mt-4">
        <JsonSearch
          data={currentRoot}
          originalData={navigatedOriginalData}
          onDataFiltered={onDataFiltered}
          onClearSearch={handleClearSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchPerformed={searchPerformed}
          setSearchPerformed={setSearchPerformed}
        />
        <div className="mb-4 flex items-center space-x-2">
          <Button
            label={isSorted ? 'Sorted' : 'Sort Alphabetically'}
            onClick={handleSortRootData}
            className="p-button-secondary"
            disabled={isSorted}
            tooltip="Preferably, click after a search has been made"
          />
          <Button
            label={showNullValues ? 'Hide Null Values' : 'Show Null Values'}
            onClick={() => setShowNullValues(!showNullValues)}
            className="p-button-secondary"
          />
          <Button
            label={isEditingHidden ? 'Edit Hidden Properties' : 'Done'}
            onClick={() => toggleEditingHidden(!isEditingHidden)}
          />
          {!isEditingHidden && (
            <Button onClick={resetHiddenPaths}>Reset Hidden Properties</Button>
          )}
          {searchPerformed && (
            <>
              <Button label="Go to Next Match" onClick={goToNextMatch} />
              <Button
                label={!expandToMatch ? 'Expand All Matches' : 'Cancel'}
                onClick={() => setExpandToMatch(!expandToMatch)}
                tooltip={
                  !expandToMatch
                    ? 'When clicking on an element, expand until all matches are visible'
                    : 'Cancel expand functionality'
                }
              />
              <span>Found {matchedCount} matches</span>
            </>
          )}
        </div>
        <JsonViewRenderer
          originalData={initialData}
          data={rootData}
          name="root"
          matchedElements={matchedElements}
          onNavigate={(data, name) => handleNavigate(data, name)}
          getParentOriginalData={getParentOriginalData}
          navigateUp={handleNavigateUp}
          isRoot={currentRoot === initialData}
          path={[]}
          originalIndices={originalIndices}
          searchPerformed={searchPerformed}
          keySearchPerformed={keySearchPerformed}
          parentClicked={false}
          showNullValues={showNullValues}
        />
      </Card>
    </div>
  )
}
