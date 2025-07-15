import React from 'react'
import { isCollectionEmpty } from '../lib/utils/json-utils'
import { ProgressSpinner } from 'primereact/progressspinner'

const JsonToggle = ({ isCollapsed, isObject, data, loading, handleToggle, depth }) => {
  return (
    <div
      onClick={() => !isCollectionEmpty(data) ? handleToggle(event) : null}
      className={`toggle ${!isCollectionEmpty(data) ? 'clickable' : ''}`}
      style={{ paddingLeft: `${depth * 20}px` }}
    >
      {isCollapsed ? (
        loading ? (
          <ProgressSpinner className="progress-spinner" />
        ) : (
          <span className="collapsed">{isObject ? '{...}' : '[...]'}</span>
        )
      ) : (
        <span className="expanded">Expand</span>
      )}
    </div>
  )
}

export default JsonToggle
