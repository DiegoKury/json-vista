export const filterData = (
  data,
  searchTerm,
  propertyType,
  searchType,
  numericCondition,
  isCaseInsensitive,
  matches = [],
  keySearchTerm,
  keySearchType,
  isKeySearchEnabled,
  initialData = null,
  isSecondarySearchEnabled = false,
  secondarySearchTerm = '',
  secondaryPropertyType = 'string',
  secondarySearchType = 'partial',
  secondaryNumericCondition = 'equal',
  isSecondaryCaseInsensitive = true,
  secondaryKeySearchTerm = '',
  secondaryKeySearchType = 'partial',
  isSecondaryKeySearchEnabled = false
) => {
  const originalIndices = {}
  let matchIdCounter = 1

  const matchesValue = (value, term, type, sType, condition, ci) => {
    if (value === null || value === undefined) return false
    if (!term) return true

    if (type === 'string') {
      if (typeof value === 'string') {
        const a = ci ? value.toLowerCase() : value
        const b = ci ? term.toLowerCase() : term
        return sType === 'exact' ? a === b : a.includes(b)
      }
      if (typeof value === 'boolean') {
        return value.toString().toLowerCase() === term.toLowerCase()
      }
    }

    if (type === 'number' && typeof value === 'number') {
      const n = parseFloat(term)
      if (condition === 'equal') return value === n
      if (condition === 'not equal') return value !== n
      if (condition === 'greater than') return value > n
      if (condition === 'less than') return value < n
    }

    return false
  }

  const matchesKey = (key, keyTerm, keyType, ci) => {
    if (!keyTerm) return true
    if (typeof key !== 'string') return false
    const a = ci ? key.toLowerCase() : key
    const b = ci ? keyTerm.toLowerCase() : keyTerm
    return keyType === 'exact' ? a === b : a.includes(b)
  }

  const primaryFilter = (node, term, type, sType, condition, ci, keyTerm, keyType, keyEnabled, path = []) => {
    if (typeof node !== 'object' || node === null) {
      const key = path[path.length - 1]
      const keyMatch = keyEnabled ? matchesKey(key, keyTerm, keyType, ci) : true
      const valMatch = matchesValue(node, term, type, sType, condition, ci)
      if (keyMatch && valMatch) {
        matches.push({ path, key, value: node, matchType: 'both' })
        return { keep: true, data: node, matchedCount: 1 }
      }
      return { keep: false, data: null, matchedCount: 0 }
    }

    if (Array.isArray(node)) {
      const filtered = new Array(node.length)
      let keep = false
      let matchedCount = 0

      for (let i = 0; i < node.length; i++) {
        const itemPath = [...path, i]
        const result = primaryFilter(node[i], term, type, sType, condition, ci, keyTerm, keyType, keyEnabled, itemPath)
        if (result.keep) {
          filtered[i] = result.data
          keep = true
          matchedCount += result.matchedCount
          originalIndices[itemPath.join('/')] = i
        } else {
          filtered[i] = undefined
        }
      }

      return keep ? { keep: true, data: filtered, matchedCount } : { keep: false, data: null, matchedCount: 0 }
    }

    // Object
    const filteredObj = {}
    let keep = false
    let matchedCount = 0

    for (const [key, value] of Object.entries(node)) {
      const itemPath = [...path, key]
      const keyMatch = keyEnabled ? matchesKey(key, keyTerm, keyType, ci) : true
      const valMatch = matchesValue(value, term, type, sType, condition, ci)
      const childResult = (typeof value === 'object' && value !== null)
        ? primaryFilter(value, term, type, sType, condition, ci, keyTerm, keyType, keyEnabled, itemPath)
        : { keep: false, data: null, matchedCount: 0 }

      if ((keyMatch && valMatch) || childResult.keep) {
        filteredObj[key] = childResult.keep ? childResult.data : value
        keep = true
        matchedCount += valMatch ? 1 : childResult.matchedCount
        if (valMatch) {
          matches.push({
            path: itemPath,
            key,
            value,
            matchType: keyMatch ? 'both' : 'value',
            id: `match-${matchIdCounter++}`,
          })
        }
        originalIndices[itemPath.join('/')] = key
      }
    }

    return keep ? { keep: true, data: filteredObj, matchedCount } : { keep: false, data: null, matchedCount: 0 }
  }

  const secondaryFilter = (filteredNode, originalNode, term, type, sType, condition, ci, keyTerm, keyType, keyEnabled, path = []) => {
    const recurse = (fNode, oNode, path) => {
      if (typeof fNode !== 'object' || fNode === null) {
        const key = path[path.length - 1]
        const keyMatch = keyEnabled ? matchesKey(key, keyTerm, keyType, ci) : true
        const valMatch = matchesValue(oNode, term, type, sType, condition, ci)
        if (keyMatch && valMatch) {
          matches.push({ path, key, value: fNode, matchType: 'both' })
          return { keep: true, data: fNode }
        }
        return { keep: false, data: null }
      }

      if (Array.isArray(fNode)) {
        const filtered = []
        let keep = false
        for (let i = 0; i < fNode.length; i++) {
          const result = recurse(fNode[i], oNode?.[i], [...path, i])
          if (result.keep) { filtered.push(result.data); keep = true }
        }
        return keep ? { keep: true, data: filtered } : { keep: false, data: null }
      }

      const filteredObj = {}
      let keep = false
      for (const [key, value] of Object.entries(fNode)) {
        const itemPath = [...path, key]
        const keyMatch = keyEnabled ? matchesKey(key, keyTerm, keyType, ci) : true
        const valMatch = matchesValue(oNode?.[key], term, type, sType, condition, ci)
        const childResult = (typeof value === 'object' && value !== null)
          ? recurse(value, oNode?.[key], itemPath)
          : { keep: false, data: null }

        if ((keyMatch && valMatch) || childResult.keep) {
          filteredObj[key] = childResult.keep ? childResult.data : value
          keep = true
          if (valMatch) {
            matches.push({ path: itemPath, key, value, matchType: keyMatch ? 'both' : 'value' })
          }
        }
      }
      return keep ? { keep: true, data: filteredObj } : { keep: false, data: null }
    }

    return recurse(filteredNode, originalNode, path)
  }

  const primaryResult = primaryFilter(
    data, searchTerm, propertyType, searchType, numericCondition, isCaseInsensitive,
    keySearchTerm, keySearchType, isKeySearchEnabled
  )

  let finalData = primaryResult.data
  let matchedCount = primaryResult.matchedCount

  if (isSecondarySearchEnabled && secondarySearchTerm && finalData) {
    const secondaryResult = secondaryFilter(
      finalData, initialData,
      secondarySearchTerm, secondaryPropertyType, secondarySearchType,
      secondaryNumericCondition, isSecondaryCaseInsensitive,
      secondaryKeySearchTerm, secondaryKeySearchType, isSecondaryKeySearchEnabled
    )
    finalData = mergeResults(finalData, secondaryResult.data)
  }

  return { data: finalData, matchedCount, originalIndices, matches }
}

const mergeResults = (primary, secondary) => {
  if (primary == null || secondary == null) return undefined

  if (Array.isArray(primary) && Array.isArray(secondary)) {
    const merged = []
    const len = Math.min(primary.length, secondary.length)
    for (let i = 0; i < len; i++) {
      const val = mergeResults(primary[i], secondary[i])
      if (val !== undefined) merged.push(val)
    }
    return merged.length > 0 ? merged : undefined
  }

  if (isPlainObject(primary) && isPlainObject(secondary)) {
    const merged = {}
    for (const key in primary) {
      if (Object.prototype.hasOwnProperty.call(secondary, key)) {
        const val = mergeResults(primary[key], secondary[key])
        if (val !== undefined) merged[key] = val
      }
    }
    return Object.keys(merged).length > 0 ? merged : undefined
  }

  return primary === secondary ? primary : undefined
}

const isPlainObject = (val) =>
  typeof val === 'object' && val !== null && !Array.isArray(val)
