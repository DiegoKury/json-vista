import { useState, useEffect } from 'react'
import { filterData } from '../search/filter'

const PROPERTY_TYPES = ['string', 'number']
const SEARCH_TYPES = ['partial', 'exact']
const NUMERIC_CONDITIONS = ['equal', 'not equal', 'greater than', 'less than']

const DEFAULT_STATE = {
  propertyType: 'string',
  searchType: 'partial',
  numericCondition: 'equal',
  isCaseInsensitive: true,
  keySearchType: 'partial',
  isKeySearchEnabled: true,
  secondaryPropertyType: 'string',
  secondarySearchType: 'partial',
  secondaryNumericCondition: 'equal',
  isSecondaryCaseInsensitive: true,
  secondaryKeySearchType: 'partial',
  isSecondaryKeySearchEnabled: true,
  isSecondarySearchEnabled: false,
}

export default function JsonSearch({
  data,
  originalData,
  onFilter,
  onClear,
  searchTerm,
  setSearchTerm,
  isFiltered,
  setIsFiltered,
}) {
  const [state, setState] = useState(DEFAULT_STATE)
  const [keySearchTerm, setKeySearchTerm] = useState('')
  const [secondarySearchTerm, setSecondarySearchTerm] = useState('')
  const [secondaryKeySearchTerm, setSecondaryKeySearchTerm] = useState('')

  const set = (key) => (value) => setState(s => ({ ...s, [key]: value }))

  useEffect(() => {
    if (searchTerm) search()
  }, [])

  const search = () => {
    const matches = []
    const {
      propertyType, searchType, numericCondition, isCaseInsensitive,
      keySearchType, isKeySearchEnabled,
      secondaryPropertyType, secondarySearchType, secondaryNumericCondition, isSecondaryCaseInsensitive,
      secondaryKeySearchType, isSecondaryKeySearchEnabled, isSecondarySearchEnabled,
    } = state

    let { data: filteredData, matchedCount, originalIndices } = filterData(
      data, searchTerm, propertyType, searchType, numericCondition, isCaseInsensitive,
      matches, keySearchTerm, keySearchType, isKeySearchEnabled,
      null, isSecondarySearchEnabled, secondarySearchTerm, secondaryPropertyType,
      secondarySearchType, secondaryNumericCondition, isSecondaryCaseInsensitive,
      secondaryKeySearchTerm, secondaryKeySearchType, isSecondaryKeySearchEnabled
    )

    if (isSecondarySearchEnabled && secondarySearchTerm) {
      const secondary = filterData(
        originalData, secondarySearchTerm, secondaryPropertyType, secondarySearchType,
        secondaryNumericCondition, isSecondaryCaseInsensitive, matches,
        secondaryKeySearchTerm, secondaryKeySearchType, isSecondaryKeySearchEnabled,
        filteredData, isSecondarySearchEnabled
      )
      filteredData = secondary.data
      matchedCount = secondary.matchedCount
    }

    onFilter(filteredData || {}, matches, matchedCount, originalIndices, isKeySearchEnabled)
    setIsFiltered(true)
  }

  const clear = () => {
    setSearchTerm('')
    setKeySearchTerm('')
    setSecondarySearchTerm('')
    setState(DEFAULT_STATE)
    setIsFiltered(false)
    onFilter({}, [])
    onClear()
  }

  const onEnter = (fn) => (e) => { if (e.key === 'Enter') fn() }

  const {
    propertyType, searchType, numericCondition, isCaseInsensitive,
    keySearchType, isKeySearchEnabled,
    secondaryPropertyType, secondarySearchType, secondaryNumericCondition, isSecondaryCaseInsensitive,
    secondaryKeySearchType, isSecondaryKeySearchEnabled, isSecondarySearchEnabled,
  } = state

  return (
    <div className="search-panel">
      {/* Primary row */}
      <div className="search-row">
        {isKeySearchEnabled && (
          <>
            <input
              className="input"
              value={keySearchTerm}
              onChange={(e) => setKeySearchTerm(e.target.value)}
              placeholder="Search keys..."
              onKeyDown={onEnter(() => keySearchTerm.trim() && search())}
            />
            <select className="select" value={keySearchType} onChange={(e) => set('keySearchType')(e.target.value)}>
              {SEARCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </>
        )}
        <button className="btn" onClick={search} disabled={!searchTerm.trim() && !keySearchTerm.trim()}>
          Search
        </button>
        {propertyType === 'string' && (
          <label className="checkbox-label">
            <input type="checkbox" checked={isCaseInsensitive} onChange={(e) => set('isCaseInsensitive')(e.target.checked)} />
            Case insensitive
          </label>
        )}
        {isFiltered && (
          <button className="btn btn-danger" onClick={clear}>Clear</button>
        )}
        <button className="btn" onClick={() => set('isKeySearchEnabled')(!isKeySearchEnabled)}>
          {isKeySearchEnabled ? '− Key search' : '+ Key search'}
        </button>
        <button className="btn" onClick={() => set('isSecondarySearchEnabled')(!isSecondarySearchEnabled)}>
          {isSecondarySearchEnabled ? '− Secondary' : '+ Secondary'}
        </button>
      </div>

      {/* Primary value row */}
      <div className="search-row">
        <input
          className="input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search values..."
          onKeyDown={onEnter(() => searchTerm.trim() && search())}
        />
        <select className="select" value={propertyType} onChange={(e) => set('propertyType')(e.target.value)}>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {propertyType === 'string' && (
          <select className="select" value={searchType} onChange={(e) => set('searchType')(e.target.value)}>
            {SEARCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {propertyType === 'number' && (
          <select className="select" value={numericCondition} onChange={(e) => set('numericCondition')(e.target.value)}>
            {NUMERIC_CONDITIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Secondary search */}
      {isSecondarySearchEnabled && (
        <>
          <div className="search-row">
            {isSecondaryKeySearchEnabled && (
              <>
                <input
                  className="input"
                  value={secondaryKeySearchTerm}
                  onChange={(e) => setSecondaryKeySearchTerm(e.target.value)}
                  placeholder="Secondary keys..."
                  onKeyDown={onEnter(() => secondaryKeySearchTerm.trim() && search())}
                />
                <select className="select" value={secondaryKeySearchType} onChange={(e) => set('secondaryKeySearchType')(e.target.value)}>
                  {SEARCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </>
            )}
            <label className="checkbox-label">
              <input type="checkbox" checked={isSecondaryCaseInsensitive} onChange={(e) => set('isSecondaryCaseInsensitive')(e.target.checked)} />
              Case insensitive
            </label>
            <button className="btn" onClick={() => set('isSecondaryKeySearchEnabled')(!isSecondaryKeySearchEnabled)}>
              {isSecondaryKeySearchEnabled ? '− Key search' : '+ Key search'}
            </button>
          </div>
          <div className="search-row">
            <input
              className="input"
              value={secondarySearchTerm}
              onChange={(e) => setSecondarySearchTerm(e.target.value)}
              placeholder="Secondary values..."
              onKeyDown={onEnter(() => secondarySearchTerm.trim() && search())}
            />
            <select className="select" value={secondaryPropertyType} onChange={(e) => set('secondaryPropertyType')(e.target.value)}>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {secondaryPropertyType === 'string' && (
              <select className="select" value={secondarySearchType} onChange={(e) => set('secondarySearchType')(e.target.value)}>
                {SEARCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {secondaryPropertyType === 'number' && (
              <select className="select" value={secondaryNumericCondition} onChange={(e) => set('secondaryNumericCondition')(e.target.value)}>
                {NUMERIC_CONDITIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </>
      )}
    </div>
  )
}
