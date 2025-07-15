import React from 'react'

const ScalarValue = ({ data, path, isMatched, searchPerformed }) => {
  const className = isMatched && searchPerformed ? 'bg-blue-200' : ''
  return (
    <span className={`scalar-${typeof data} ${className}`}>
      {JSON.stringify(data)}
    </span>
  )
}

export default ScalarValue
