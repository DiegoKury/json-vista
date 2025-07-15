import React from 'react'
import '../styles/json-view-renderer.css'
import JsonTreeNode from './json-tree-node/json-tree-node.jsx'

const JsonViewRenderer = ({
  originalData,
  data,
  onNavigate,
  getParentOriginalData,
  navigateUp,
  isRoot,
  matchedElements,
  searchPerformed,
  parentClicked,
  originalIndices,
  keySearchPerformed,
  showNullValues
}) => {
  return (
    <table className="json-view-renderer">
      <tbody>
        <JsonTreeNode
          originalData={originalData}
          data={data}
          name="root"
          onNavigate={onNavigate}
          getParentOriginalData={getParentOriginalData}
          navigateUp={navigateUp}
          isRoot={isRoot}
          matchedElements={matchedElements}
          searchPerformed={searchPerformed}
          keySearchPerformed={keySearchPerformed}
          parentClicked={false}
          depth={0}
          path={[]}
          originalIndices={originalIndices}
          isParentOriginal={false}
          showNullValues={showNullValues}
        />
      </tbody>
    </table>
  )
}

export default JsonViewRenderer
