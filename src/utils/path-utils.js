import { getGeneralizedSegment } from './json-utils'

export const isPathHidden = (path, hiddenPaths = []) => {
  return hiddenPaths.some(hiddenPath => {
    if (hiddenPath.length !== path.length) return false
    return hiddenPath.every((part, i) => part === '*' || part === path[i])
  })
}

export const cleanPath = (path) => path.map(getGeneralizedSegment)

export const pathsAreEqual = (path1, path2) => {
  if (path1.length !== path2.length) return false
  return path1.every((seg, i) => seg === '*' || path2[i] === '*' || seg === path2[i])
}
