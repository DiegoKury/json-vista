import React, { createContext, useContext, useState, useEffect } from 'react'

const JsonTreeContext = createContext()

export const JsonTreeProvider = ({ children }) => {
  const [isEditingHidden, setIsEditingHidden] = useState(true)
  const [showAllHiddenTemporarily, setShowAllHiddenTemporarily] = useState(false)
  const [expandToMatch, setExpandToMatch] = useState(false)
  const [collapseDepth, setCollapseDepth] = useState(null)
  const [firstMatchPath, setFirstMatchPath] = useState(null)
  const [hiddenPaths, setHiddenPaths] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenPaths')
      const storedHideProps = sessionStorage.getItem('hideProps')
      let initialPaths = []
      let hideProps = []
      
      try {
        initialPaths = saved ? JSON.parse(saved) : []
        if (!Array.isArray(initialPaths)) {
          initialPaths = []
        }
      } catch (e) {
        initialPaths = []
      }
      
      try {
        hideProps = storedHideProps ? JSON.parse(storedHideProps) : []
        if (!Array.isArray(hideProps)) {
          hideProps = []
        }
      } catch (e) {
        hideProps = []
      }

      return [...new Set([...initialPaths, ...hideProps])]
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hiddenPaths', JSON.stringify(hiddenPaths))
      sessionStorage.removeItem('hideProps')
    }
  }, [hiddenPaths])

  const pathsAreEqual = (path1, path2) => {
    if (path1.length !== path2.length) return false
    for (let i = 0; i < path1.length; i++) {
      if (path1[i] !== "*" && path2[i] !== "*" && path1[i] !== path2[i]) {
        return false
      }
    }
    return true
  }

  const handleToggleHide = (pathPattern) => {
    setHiddenPaths(current => {
      const index = current.findIndex(path => pathsAreEqual(path, pathPattern))
      if (index >= 0) {
        return current.filter((_, idx) => idx !== index)
      } else {
        return [...current, pathPattern]
      }
    })
  }

  const handleToggleCollapseDepth = (depth) => {
    setCollapseDepth(depth)
  }

  const resetHiddenPaths = () => {
    setHiddenPaths([])
  }

  const toggleEditingHidden = () => {
    setShowAllHiddenTemporarily(current => !current)
    setIsEditingHidden(current => !current)
  }

  return (
    <JsonTreeContext.Provider value={{
      hiddenPaths, showAllHiddenTemporarily, isEditingHidden, firstMatchPath, collapseDepth, expandToMatch,
      handleToggleHide, resetHiddenPaths, toggleEditingHidden, setFirstMatchPath, handleToggleCollapseDepth, setExpandToMatch,
      setHiddenPaths, setCollapseDepth, setShowAllHiddenTemporarily
    }}>
      {children}
    </JsonTreeContext.Provider>
  )
}

export const useJsonTree = () => useContext(JsonTreeContext)
