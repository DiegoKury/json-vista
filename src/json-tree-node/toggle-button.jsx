import React from 'react'
import { ProgressSpinner } from 'primereact/progressspinner'
import { isCollectionEmpty } from '../lib/utils/json-utils'

const ToggleButton = ({ data, collapsed, handleToggle, loading, elementClassname, isObjectType }) => {
  return (
    <div onClick={handleToggle} className={`toggle-button ${!isCollectionEmpty(data) ? 'clickable' : ''}`}>
      {collapsed ? (
        loading ? (
          <ProgressSpinner className="progress-spinner" />
        ) : (
          <span className={elementClassname}>
            {!isCollectionEmpty(data) ? (
              <>
                <i className="pi pi-chevron-right" style={{ paddingRight: '0.2em' }}></i>
                {isObjectType ? '{...}' : '[...]'}
              </>
            ) : isObjectType ? '{}' : '[]'}
          </span>
        )
      ) : (
        <span className={`toggle-icon ${elementClassname}`}>
          <i className="pi pi-chevron-down" style={{ paddingRight: '0.2em' }}></i>
          <em>{isObjectType ? 'object' : 'array'}</em>
        </span>
      )}
    </div>
  )
}

export default ToggleButton
