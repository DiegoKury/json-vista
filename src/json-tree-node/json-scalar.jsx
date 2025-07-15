import React from 'react'

const JsonScalar = ({ value, matchedScalars, searchPerformed }) => {
  const className = matchedScalars.includes(value) && searchPerformed ? 'bg-blue-200' : ''
  
  return (
    <span className={`scalar-${typeof value} ${className}`}>
      {JSON.stringify(value)}
    </span>
  )
}

export default JsonScalar
