import React from 'react'

const ScalarDisplay = ({ data, isMatched, isFiltered }) => (
  <span className={`scalar-${typeof data}${isMatched && isFiltered ? ' highlight-match' : ''}`}>
    {JSON.stringify(data)}
  </span>
)

export default ScalarDisplay
