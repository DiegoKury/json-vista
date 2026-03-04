import type { JsonValue, Match, Path } from '../types'

type PropertyType = 'string' | 'number'
type SearchType = 'partial' | 'exact'
type NumericCondition = 'equal' | 'not equal' | 'greater than' | 'less than'

export interface FilterOptions {
  searchTerm: string
  propertyType: PropertyType
  searchType: SearchType
  numericCondition: NumericCondition
  isCaseInsensitive: boolean
  keySearchTerm: string
  keySearchType: SearchType
  isKeySearchEnabled: boolean
  isSecondarySearchEnabled?: boolean
  secondarySearchTerm?: string
  secondaryPropertyType?: PropertyType
  secondarySearchType?: SearchType
  secondaryNumericCondition?: NumericCondition
  isSecondaryCaseInsensitive?: boolean
  secondaryKeySearchTerm?: string
  secondaryKeySearchType?: SearchType
  isSecondaryKeySearchEnabled?: boolean
}

export interface FilterResult {
  data: JsonValue
  matchedCount: number
  originalIndices: Record<string, string | number>
  matches: Match[]
}

export const filterData = (
  data: JsonValue,
  opts: FilterOptions,
  initialData: JsonValue = null
): FilterResult => {
  const {
    searchTerm,
    propertyType,
    searchType,
    numericCondition,
    isCaseInsensitive,
    keySearchTerm,
    keySearchType,
    isKeySearchEnabled,
    isSecondarySearchEnabled = false,
    secondarySearchTerm = '',
    secondaryPropertyType = 'string',
    secondarySearchType = 'partial',
    secondaryNumericCondition = 'equal',
    isSecondaryCaseInsensitive = true,
    secondaryKeySearchTerm = '',
    secondaryKeySearchType = 'partial',
    isSecondaryKeySearchEnabled = false,
  } = opts

  const originalIndices: Record<string, string | number> = {}
  const matches: Match[] = []
  let matchIdCounter = 1

  const matchesValue = (
    value: JsonValue,
    term: string,
    type: PropertyType,
    sType: SearchType,
    condition: NumericCondition,
    ci: boolean
  ): boolean => {
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
      if (typeof value === 'number') {
        const str = String(value)
        const a = ci ? str.toLowerCase() : str
        const b = ci ? term.toLowerCase() : term
        return sType === 'exact' ? a === b : a.includes(b)
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

  const matchesKey = (
    key: string | number,
    keyTerm: string,
    keyType: SearchType,
    ci: boolean
  ): boolean => {
    if (!keyTerm) return true
    if (typeof key !== 'string') return false
    const a = ci ? key.toLowerCase() : key
    const b = ci ? keyTerm.toLowerCase() : keyTerm
    return keyType === 'exact' ? a === b : a.includes(b)
  }

  const primaryFilter = (
    node: JsonValue,
    term: string,
    type: PropertyType,
    sType: SearchType,
    condition: NumericCondition,
    ci: boolean,
    keyTerm: string,
    keyType: SearchType,
    keyEnabled: boolean,
    path: Path = []
  ): { keep: boolean; data: JsonValue; matchedCount: number } => {
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
      const filtered: JsonValue[] = new Array(node.length)
      let keep = false
      let matchedCount = 0

      for (let i = 0; i < node.length; i++) {
        const itemPath: Path = [...path, i]
        const result = primaryFilter(node[i], term, type, sType, condition, ci, keyTerm, keyType, keyEnabled, itemPath)
        if (result.keep) {
          filtered[i] = result.data
          keep = true
          matchedCount += result.matchedCount
          originalIndices[itemPath.join('/')] = i
        } else {
          filtered[i] = undefined as unknown as JsonValue
        }
      }

      return keep ? { keep: true, data: filtered, matchedCount } : { keep: false, data: null, matchedCount: 0 }
    }

    const filteredObj: Record<string, JsonValue> = {}
    let keep = false
    let matchedCount = 0

    for (const [key, value] of Object.entries(node)) {
      const itemPath: Path = [...path, key]
      const keyMatch = keyEnabled ? matchesKey(key, keyTerm, keyType, ci) : true
      const valMatch = matchesValue(value, term, type, sType, condition, ci)
      const childResult =
        typeof value === 'object' && value !== null
          ? primaryFilter(value, term, type, sType, condition, ci, keyTerm, keyType, keyEnabled, itemPath)
          : { keep: false, data: null, matchedCount: 0 }

      if ((keyMatch && valMatch) || childResult.keep) {
        filteredObj[key] = childResult.keep ? childResult.data! : value
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

  const secondaryFilter = (
    filteredNode: JsonValue,
    originalNode: JsonValue,
    term: string,
    type: PropertyType,
    sType: SearchType,
    condition: NumericCondition,
    ci: boolean,
    keyTerm: string,
    keyType: SearchType,
    keyEnabled: boolean,
    path: Path = []
  ): { keep: boolean; data: JsonValue } => {
    const recurse = (fNode: JsonValue, oNode: JsonValue, p: Path): { keep: boolean; data: JsonValue } => {
      if (typeof fNode !== 'object' || fNode === null) {
        const key = p[p.length - 1]
        const keyMatch = keyEnabled ? matchesKey(key, keyTerm, keyType, ci) : true
        const valMatch = matchesValue(oNode, term, type, sType, condition, ci)
        if (keyMatch && valMatch) {
          matches.push({ path: p, key, value: fNode, matchType: 'both' })
          return { keep: true, data: fNode }
        }
        return { keep: false, data: null }
      }

      if (Array.isArray(fNode)) {
        const oArr = Array.isArray(oNode) ? oNode : []
        const filtered: JsonValue[] = []
        let keep = false
        for (let i = 0; i < (fNode as JsonValue[]).length; i++) {
          const item = (fNode as JsonValue[])[i]
          if (item === undefined) continue
          const result = recurse(item, oArr[i] ?? null, [...p, i])
          if (result.keep) { filtered.push(result.data); keep = true }
        }
        return keep ? { keep: true, data: filtered } : { keep: false, data: null }
      }

      const oObj = (typeof oNode === 'object' && oNode !== null && !Array.isArray(oNode))
        ? (oNode as Record<string, JsonValue>) : {}

      // Check for direct key+value matches within this object
      let hasDirectMatch = false
      for (const [key, value] of Object.entries(fNode as Record<string, JsonValue>)) {
        const itemPath: Path = [...p, key]
        const keyMatch = keyEnabled ? matchesKey(key, keyTerm, keyType, ci) : true
        const valMatch = matchesValue(oObj[key] ?? null, term, type, sType, condition, ci)
        if (keyMatch && valMatch) {
          matches.push({ path: itemPath, key, value, matchType: keyMatch ? 'both' : 'value' })
          hasDirectMatch = true
        }
      }
      // Keep the full primary object if any key matched secondary
      if (hasDirectMatch) return { keep: true, data: fNode }

      // No direct match — recurse into nested collections
      const filteredObj: Record<string, JsonValue> = {}
      let keep = false
      for (const [key, value] of Object.entries(fNode as Record<string, JsonValue>)) {
        if (typeof value === 'object' && value !== null) {
          const result = recurse(value, oObj[key] ?? null, [...p, key])
          if (result.keep) { filteredObj[key] = result.data; keep = true }
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
      secondarySearchTerm, secondaryPropertyType!, secondarySearchType!,
      secondaryNumericCondition!, isSecondaryCaseInsensitive!,
      secondaryKeySearchTerm!, secondaryKeySearchType!, isSecondaryKeySearchEnabled!
    )
    finalData = secondaryResult.data
    matchedCount = matches.length
  }

  return { data: finalData!, matchedCount, originalIndices, matches }
}

