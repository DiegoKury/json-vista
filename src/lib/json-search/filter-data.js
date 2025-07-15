export const filterData = (
  data,
  searchTerm,
  propertyType,
  searchType,
  numericCondition,
  isCaseInsensitive,
  matchedElements = [],
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

  const matchesSearchTerm = (
    value,
    term = searchTerm,
    type = propertyType,
    searchTypeValue = searchType,
    condition = numericCondition,
    caseInsensitive = isCaseInsensitive
  ) => {
    if (value === null || value === undefined) return false
    if (!term) return true
    if (type === 'string') {
      if (typeof value === 'string') {
        let comparisonValue = caseInsensitive ? value.toLowerCase() : value
        let comparisonSearchTerm = caseInsensitive ? term.toLowerCase() : term
        return searchTypeValue === 'exact'
          ? comparisonValue === comparisonSearchTerm
          : comparisonValue.includes(comparisonSearchTerm)
      } else if (typeof value === 'boolean') {
        let comparisonValue = value.toString().toLowerCase()
        let comparisonSearchTerm = term.toLowerCase()
        return comparisonValue === comparisonSearchTerm
      }
    } else if (type === 'number' && typeof value === 'number') {
      const searchNumber = parseFloat(term)
      switch (condition) {
        case 'equal':
          return value === searchNumber
        case 'not equal':
          return value !== searchNumber
        case 'greater than':
          return value > searchNumber
        case 'less than':
          return value < searchNumber
        default:
          return false
      }
    }
    return false
  }

  const matchesKeySearchTerm = (
    key,
    keyTerm = keySearchTerm,
    keyTypeValue = keySearchType,
    caseInsensitive = isCaseInsensitive
  ) => {
    if (!keyTerm) return true
    if (typeof key === 'string') {
      let comparisonKey = caseInsensitive ? key.toLowerCase() : key
      let comparisonKeySearchTerm = caseInsensitive ? keyTerm.toLowerCase() : keyTerm
      return keyTypeValue === 'exact'
        ? comparisonKey === comparisonKeySearchTerm
        : comparisonKey.includes(comparisonKeySearchTerm)
    }
    return false
  }

  const filterForPropertySearch = (
    data,
    term,
    type,
    searchTypeValue,
    condition,
    caseInsensitive,
    matchedElements,
    keyTerm,
    keyType,
    keyEnabled,
    path = []
  ) => {
    if (typeof data === 'object' && data !== null) {
      let shouldKeep = false
      let matchedCount = 0

      if (!Array.isArray(data)) {
        // Object handling
        const filteredObject = {}
        for (const [key, value] of Object.entries(data)) {
          const itemPath = [...path, key]
          const keyMatches = keyEnabled
            ? matchesKeySearchTerm(key, keyTerm, keyType, caseInsensitive)
            : true
          const valueMatches = matchesSearchTerm(value, term, type, searchTypeValue, condition, caseInsensitive)

          let childResult = { keep: false, data: null, matchedCount: 0 }

          if (typeof value === 'object' && value !== null) {
            childResult = filterForPropertySearch(
              value,
              term,
              type,
              searchTypeValue,
              condition,
              caseInsensitive,
              matchedElements,
              keyTerm,
              keyType,
              keyEnabled,
              itemPath
            )
          }

          if ((keyMatches && valueMatches) || childResult.keep) {
            filteredObject[key] = childResult.keep ? childResult.data : value
            shouldKeep = true
            matchedCount += valueMatches ? 1 : childResult.matchedCount
            if (valueMatches) {
              matchedElements.push({
                path: itemPath,
                key: key,
                value: value,
                matchType: keyMatches ? 'both' : 'value',
                id: `match-${matchIdCounter++}`
              })
            }
            originalIndices[itemPath.join('/')] = key
          }
        }

        if (shouldKeep) {
          return { keep: true, data: filteredObject, matchedCount }
        } else {
          return { keep: false, data: null, matchedCount: 0 }
        }
      } else {
        // Array handling
        const filteredArray = new Array(data.length)
        for (let index = 0; index < data.length; index++) {
          const item = data[index]
          const itemPath = [...path, index]
          const result = filterForPropertySearch(
            item,
            term,
            type,
            searchTypeValue,
            condition,
            caseInsensitive,
            matchedElements,
            keyTerm,
            keyType,
            keyEnabled,
            itemPath
          )
          if (result.keep) {
            filteredArray[index] = result.data
            shouldKeep = true
            matchedCount += result.matchedCount
            originalIndices[itemPath.join('/')] = index
          } else {
            filteredArray[index] = undefined // Preserve index with undefined
          }
        }

        if (shouldKeep) {
          return { keep: true, data: filteredArray, matchedCount }
        } else {
          return { keep: false, data: null, matchedCount: 0 }
        }
      }
    } else {
      // Scalar values
      const key = path[path.length - 1]
      const keyMatches = keyEnabled
        ? matchesKeySearchTerm(key, keyTerm, keyType, caseInsensitive)
        : true
      const valueMatches = matchesSearchTerm(data, term, type, searchTypeValue, condition, caseInsensitive)

      if (keyMatches && valueMatches) {
        matchedElements.push({
          path: path,
          key: key,
          value: data,
          matchType: 'both',
        })
        return { keep: true, data, matchedCount: 1 }
      }
      return { keep: false, data: null, matchedCount: 0 }
    }
  }

  const secondaryFilter = (
    data,
    initialData,
    term,
    type,
    searchTypeValue,
    condition,
    caseInsensitive,
    matchedElements,
    keyTerm,
    keyType,
    keyEnabled,
    path = []
  ) => {
    const filterOriginalData = (data, originalData, path = []) => {
      if (typeof data === 'object' && data !== null) {
        let shouldKeep = false

        if (!Array.isArray(data)) {
          const filteredObject = {}
          for (const [key, value] of Object.entries(data)) {
            const itemPath = [...path, key]
            const originalValue = originalData?.[key]

            const keyMatches = keyEnabled
              ? matchesKeySearchTerm(key, keyTerm, keyType, caseInsensitive)
              : true
            const valueMatches = matchesSearchTerm(
              originalValue,
              term,
              type,
              searchTypeValue,
              condition,
              caseInsensitive
            )

            let childResult = { keep: false, data: null }

            if (typeof value === 'object' && value !== null) {
              childResult = filterOriginalData(value, originalValue, itemPath)
            }

            if ((keyMatches && valueMatches) || childResult.keep) {
              filteredObject[key] = childResult.keep ? childResult.data : value
              shouldKeep = true
              if (valueMatches) {
                matchedElements.push({
                  path: itemPath,
                  key: key,
                  value: value,
                  matchType: keyMatches ? 'both' : 'value',
                })
              }
            }
          }

          if (shouldKeep) {
            return { keep: true, data: filteredObject }
          } else {
            return { keep: false, data: null }
          }
        } else {
          // Array handling
          const filteredArray = []
          for (let index = 0; index < data.length; index++) {
            const item = data[index]
            const originalValue = originalData?.[index]
            const itemPath = [...path, index]
            const result = filterOriginalData(item, originalValue, itemPath)
            if (result.keep) {
              filteredArray.push(result.data)
              shouldKeep = true
            }
          }

          if (shouldKeep) {
            return { keep: true, data: filteredArray }
          } else {
            return { keep: false, data: null }
          }
        }
      } else {
        // Scalar values
        const key = path[path.length - 1]
        const keyMatches = keyEnabled
          ? matchesKeySearchTerm(key, keyTerm, keyType, caseInsensitive)
          : true
        const valueMatches = matchesSearchTerm(
          originalData,
          term,
          type,
          searchTypeValue,
          condition,
          caseInsensitive
        )

        if (keyMatches && valueMatches) {
          matchedElements.push({
            path: path,
            key: key,
            value: data,
            matchType: 'both',
          })
          return { keep: true, data }
        }
        return { keep: false, data: null }
      }
    }

    return filterOriginalData(data, initialData, path)
  }

  const primaryFilterResult = filterForPropertySearch(
    data,
    searchTerm,
    propertyType,
    searchType,
    numericCondition,
    isCaseInsensitive,
    matchedElements,
    keySearchTerm,
    keySearchType,
    isKeySearchEnabled
  )

  let finalFilteredData = primaryFilterResult.data
  let matchedCount = primaryFilterResult.matchedCount

  if (isSecondarySearchEnabled && secondarySearchTerm) {
    const secondarySearchResults = secondaryFilter(
      finalFilteredData,
      initialData,
      secondarySearchTerm,
      secondaryPropertyType,
      secondarySearchType,
      secondaryNumericCondition,
      isSecondaryCaseInsensitive,
      matchedElements,
      secondaryKeySearchTerm,
      secondaryKeySearchType,
      isSecondaryKeySearchEnabled
    )

    finalFilteredData = mergeFilteredData(finalFilteredData, secondarySearchResults.data)
  }

  return {
    data: finalFilteredData,
    matchedCount: matchedCount,
    originalIndices,
    matchedElements,
  }
}

const mergeFilteredData = (primaryData, secondaryData) => {
  if (primaryData == null || secondaryData == null) {
    return undefined
  }

  if (
    typeof primaryData === 'object' &&
    primaryData !== null &&
    typeof secondaryData === 'object' &&
    secondaryData !== null &&
    !Array.isArray(primaryData)
  ) {
    const mergedObject = {}
    for (const key in primaryData) {
      if (
        secondaryData != null &&
        typeof secondaryData === 'object' &&
        secondaryData.hasOwnProperty(key)
      ) {
        const mergedValue = mergeFilteredData(primaryData[key], secondaryData[key])
        if (mergedValue !== undefined) {
          mergedObject[key] = mergedValue
        }
      }
    }
    return Object.keys(mergedObject).length > 0 ? mergedObject : undefined
  } else if (Array.isArray(primaryData) && Array.isArray(secondaryData)) {
    const mergedArray = []
    const minLength = Math.min(primaryData.length, secondaryData.length)
    for (let i = 0; i < minLength; i++) {
      const mergedValue = mergeFilteredData(primaryData[i], secondaryData[i])
      if (mergedValue !== undefined) {
        mergedArray.push(mergedValue)
      }
    }
    return mergedArray.length > 0 ? mergedArray : undefined
  } else {
    return primaryData === secondaryData ? primaryData : undefined
  }
}
