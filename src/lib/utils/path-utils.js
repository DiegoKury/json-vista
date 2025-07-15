export const isPathHidden = (path, hiddenPaths = []) => {
  return hiddenPaths.some(hiddenPath => {
    if (hiddenPath.length !== path.length) return false
    return hiddenPath.every((part, index) => part === '*' || part === path[index])
  })
}

export const cleanPath = (path) => {
  return path.map((segment) => getGeneralizedSegment(segment))
}

export const pathsAreEqual = (path1, path2) => {
  if (path1.length !== path2.length) return false
  for (let i = 0; i < path1.length; i++) {
    if (path1[i] !== '*' && path2[i] !== '*' && path1[i] !== path2[i]) {
      return false
    }
  }
  return true
}
