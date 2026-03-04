import React from 'react'
import { isCollectionEmpty } from '../../utils/json-utils'

const ChevronRight = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const NodeToggle = ({ data, collapsed, handleToggle, loading, elementClassname, isObjectType }) => {
  const empty = isCollectionEmpty(data)

  return (
    <div onClick={handleToggle} className={`node-toggle${!empty ? ' clickable' : ''}`}>
      {collapsed ? (
        loading ? (
          <span className="spinner" />
        ) : (
          <span className={elementClassname}>
            {!empty
              ? <><ChevronRight /> {isObjectType ? '{...}' : '[...]'}</>
              : isObjectType ? '{}' : '[]'
            }
          </span>
        )
      ) : (
        <span className={elementClassname}>
          <ChevronDown /> <em>{isObjectType ? 'object' : 'array'}</em>
        </span>
      )}
    </div>
  )
}

export default NodeToggle
