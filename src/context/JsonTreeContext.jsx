import React, { createContext, useContext, useState, useEffect } from 'react'
import { pathsAreEqual } from '../utils/path-utils'

const JsonTreeContext = createContext()

export const JsonTreeProvider = ({ children }) => {
  const [isPatternHideMode, setIsPatternHideMode] = useState(true)
  const [previewHidden, setPreviewHidden] = useState(false)
  const [expandToMatch, setExpandToMatch] = useState(false)
  const [collapseDepth, setCollapseDepth] = useState(null)
  const [firstMatchPath, setFirstMatchPath] = useState(null)
  const [hiddenPaths, setHiddenPaths] = useState(() => {
    if (typeof window === 'undefined') return []

    let saved = []
    let session = []
    try { saved = JSON.parse(localStorage.getItem('hiddenPaths') || '[]') } catch {}
    try { session = JSON.parse(sessionStorage.getItem('hideProps') || '[]') } catch {}

    return [...new Set([
      ...(Array.isArray(saved) ? saved : []),
      ...(Array.isArray(session) ? session : []),
    ])]
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('hiddenPaths', JSON.stringify(hiddenPaths))
    sessionStorage.removeItem('hideProps')
  }, [hiddenPaths])

  const handleToggleHide = (pathPattern) => {
    setHiddenPaths(current => {
      const index = current.findIndex(p => pathsAreEqual(p, pathPattern))
      return index >= 0
        ? current.filter((_, i) => i !== index)
        : [...current, pathPattern]
    })
  }

  const resetHiddenPaths = () => setHiddenPaths([])

  // Switches between pattern-hide mode (eraser buttons) and individual-toggle mode (checkboxes).
  // In individual mode, hidden paths are temporarily revealed so they can be toggled.
  const toggleHideMode = () => {
    setPreviewHidden(v => !v)
    setIsPatternHideMode(v => !v)
  }

  return (
    <JsonTreeContext.Provider value={{
      hiddenPaths,
      previewHidden,
      isPatternHideMode,
      firstMatchPath,
      collapseDepth,
      expandToMatch,
      handleToggleHide,
      resetHiddenPaths,
      toggleHideMode,
      setFirstMatchPath,
      setExpandToMatch,
      setCollapseDepth,
      setHiddenPaths,
      setPreviewHidden,
    }}>
      {children}
    </JsonTreeContext.Provider>
  )
}

export const useJsonTree = () => useContext(JsonTreeContext)
