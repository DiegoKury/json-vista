export const isObject = (val) => val && typeof val === 'object' && !Array.isArray(val)

export const isArray = (val) => Array.isArray(val)

export const isCollectionEmpty = (value) => {
  if (value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return true
}

export const cleanData = (data) => {
  if (isObject(data)) {
    const { originalIndex, ...rest } = data
    return rest
  }
  return data
}

// Replaces numeric array indices and UUIDs with '*' for path pattern matching
export const getGeneralizedSegment = (segment) => {
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(segment)
  return isUUID || !isNaN(segment) ? '*' : segment
}

export const getIndentationStyle = (depth) => ({ paddingLeft: `${depth * 20}px` })
