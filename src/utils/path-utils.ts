import type { Path, HiddenPath, PathSegment } from '../types'
import { getGeneralizedSegment } from './utils'

export const isPathHidden = (path: Path, hiddenPaths: HiddenPath[] = []): boolean => {
  return hiddenPaths.some(hiddenPath => {
    if (hiddenPath.length !== path.length) return false
    return hiddenPath.every((part, i) => part === '*' || part === path[i])
  })
}

export const cleanPath = (path: Path): string[] => path.map(getGeneralizedSegment)

export const pathsAreEqual = (path1: PathSegment[], path2: PathSegment[]): boolean => {
  if (path1.length !== path2.length) return false
  return path1.every((seg, i) => seg === '*' || path2[i] === '*' || seg === path2[i])
}
