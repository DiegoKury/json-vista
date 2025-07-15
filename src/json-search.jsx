import React, { useState, useEffect } from 'react'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import 'primereact/resources/themes/saga-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import { filterData } from './lib/json-search/filter-data'

export default function JsonSearch({
  data,
  onDataFiltered,
  onClearSearch,
  searchTerm,
  setSearchTerm,
  searchPerformed,
  setSearchPerformed,
  originalData,
}) {
  const [propertyType, setPropertyType] = useState('string')
  const [searchType, setSearchType] = useState('partial')
  const [numericCondition, setNumericCondition] = useState('equal')
  const [isCaseInsensitive, setIsCaseInsensitive] = useState(true)

  const [keySearchTerm, setKeySearchTerm] = useState('')
  const [keySearchType, setKeySearchType] = useState('partial')
  const [isKeySearchEnabled, setIsKeySearchEnabled] = useState(true)

  const [secondarySearchTerm, setSecondarySearchTerm] = useState('')
  const [secondaryPropertyType, setSecondaryPropertyType] = useState('string')
  const [secondarySearchType, setSecondarySearchType] = useState('partial')
  const [secondaryNumericCondition, setSecondaryNumericCondition] = useState('equal')
  const [isSecondaryCaseInsensitive, setIsSecondaryCaseInsensitive] = useState(true)

  const [secondaryKeySearchTerm, setSecondaryKeySearchTerm] = useState('')
  const [secondaryKeySearchType, setSecondaryKeySearchType] = useState('partial')
  const [isSecondaryKeySearchEnabled, setIsSecondaryKeySearchEnabled] = useState(true)
  const [isSecondarySearchEnabled, setIsSecondarySearchEnabled] = useState(false)

  const [exportData, setExportData] = useState({})

  const propertyTypes = [
    { label: 'String', value: 'string' },
    { label: 'Number', value: 'number' }
  ]

  const searchTypes = [
    { label: 'Partial', value: 'partial' },
    { label: 'Exact', value: 'exact' }
  ]

  const numericConditions = [
    { label: 'Equal', value: 'equal' },
    { label: 'Not Equal', value: 'not equal' },
    { label: 'Greater Than', value: 'greater than' },
    { label: 'Less Than', value: 'less than' }
  ]

  useEffect(() => {
    if (searchTerm) {
      handleSearch()
    }
  }, [])

  const handleSearch = () => {
    let matchedElements = []
    let { data: filteredData, matchedCount, originalIndices } = filterData(
      data,
      searchTerm,
      propertyType,
      searchType,
      numericCondition,
      isCaseInsensitive,
      matchedElements,
      keySearchTerm,
      keySearchType,
      isKeySearchEnabled,
      null,
      isSecondarySearchEnabled,
      secondarySearchTerm,
      secondaryPropertyType,
      secondarySearchType,
      secondaryNumericCondition,
      isSecondaryCaseInsensitive,
      secondaryKeySearchTerm,
      secondaryKeySearchType,
      isSecondaryKeySearchEnabled
    )

    if (isSecondarySearchEnabled && secondarySearchTerm) {
      const secondarySearchResults = filterData(
        originalData,
        secondarySearchTerm,
        secondaryPropertyType,
        secondarySearchType,
        secondaryNumericCondition,
        isSecondaryCaseInsensitive,
        matchedElements,
        secondaryKeySearchTerm,
        secondaryKeySearchType,
        isSecondaryKeySearchEnabled,
        filteredData,
        isSecondarySearchEnabled
      )
      filteredData = secondarySearchResults.data
      matchedCount = secondarySearchResults.matchedCount
    }

    const exportPayload = {
      searchTerm,
      propertyType,
      searchType,
      numericCondition,
      isCaseInsensitive,
      keySearchTerm,
      keySearchType,
      isKeySearchEnabled,
      matchedElements,
      matchedCount,
      filteredData,
      originalIndices,
    }

    setExportData(exportPayload)

    onDataFiltered(
      filteredData || {},
      matchedElements,
      matchedCount,
      originalIndices,
      isKeySearchEnabled
    )
    setSearchPerformed(true)
  }

  const handleClear = () => {
    setSearchPerformed(false)
    setSearchTerm('')
    setKeySearchTerm('')
    setSecondarySearchTerm('')
    setPropertyType('string')
    setSearchType('partial')
    setNumericCondition('equal')
    setIsCaseInsensitive(true)
    setIsKeySearchEnabled(true)
    setIsSecondaryKeySearchEnabled(false)
    setIsSecondarySearchEnabled(false)
    onDataFiltered({}, [])
    onClearSearch()
  }

  const exportAsJSON = () => {
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `search-results.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleKeySearch = () => {
    setIsKeySearchEnabled(!isKeySearchEnabled)
  }

  const toggleSecondaryKeySearch = () => {
    setIsSecondaryKeySearchEnabled(!isSecondaryKeySearchEnabled)
  }

  const toggleSecondarySearch = () => {
    setIsSecondarySearchEnabled(!isSecondarySearchEnabled)
  }

  return (
    <div className="mb-4 flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        {isKeySearchEnabled && (
          <>
            <InputText
              value={keySearchTerm}
              onChange={(e) => setKeySearchTerm(e.target.value)}
              placeholder="Search keys..."
              className="p-mr-2"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && keySearchTerm.trim() !== '') {
                  handleSearch()
                }
              }}
            />
            <Dropdown
              value={keySearchType}
              options={searchTypes}
              onChange={(e) => setKeySearchType(e.value)}
              placeholder="Select Search Type"
              className="p-mr-2"
            />
          </>
        )}
        <Button
          label="Search"
          icon="pi pi-search"
          onClick={handleSearch}
          disabled={searchTerm.trim() === '' && keySearchTerm.trim() === ''}
        />
        {propertyType === 'string' && (
          <div>
            <Checkbox
              inputId="caseInsensitive"
              checked={isCaseInsensitive}
              onChange={(e) => setIsCaseInsensitive(e.checked)}
            />
            <label htmlFor="caseInsensitive"> Case Insensitive</label>
          </div>
        )}
        {searchPerformed && (
          <>
            <Button
              label="Clear Search"
              icon="pi pi-times"
              onClick={handleClear}
              className="p-button-danger"
            />
            {/*<Button
              label="Export Search as JSON"
              icon="pi pi-download"
              onClick={exportAsJSON}
              className="p-button-secondary"
            /> For debugging */}
          </>
        )}
        <Button
          label={isKeySearchEnabled ? "Remove Key Search" : "Add Key Search"}
          icon={isKeySearchEnabled ? "pi pi-minus" : "pi pi-plus"}
          onClick={toggleKeySearch}
        />
        <Button
          label={isSecondarySearchEnabled ? "Remove Secondary Search" : "Add Secondary Search"}
          icon={isSecondarySearchEnabled ? "pi pi-minus" : "pi pi-plus"}
          onClick={toggleSecondarySearch}
        />
      </div>
      <div className="flex space-x-2">
        <InputText
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search values..."
          className="p-mr-2"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && searchTerm.trim() !== '') {
              handleSearch()
            }
          }}
        />
        <Dropdown
          value={propertyType}
          options={propertyTypes}
          onChange={(e) => setPropertyType(e.value)}
          placeholder="Select a Type"
          className="p-mr-2"
        />
        {propertyType === 'string' && (
          <Dropdown
            value={searchType}
            options={searchTypes}
            onChange={(e) => setSearchType(e.value)}
            placeholder="Select Search Type"
            className="p-mr-2"
          />
        )}
        {propertyType === 'number' && (
          <Dropdown
            value={numericCondition}
            options={numericConditions}
            onChange={(e) => setNumericCondition(e.value)}
            placeholder="Select Condition"
            className="p-mr-2"
          />
        )}
      </div>
      {isSecondarySearchEnabled && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            {isSecondaryKeySearchEnabled && (
              <>
                <InputText
                  value={secondaryKeySearchTerm}
                  onChange={(e) => setSecondaryKeySearchTerm(e.target.value)}
                  placeholder="Search secondary keys..."
                  className="p-mr-2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && secondaryKeySearchTerm.trim() !== '') {
                      handleSearch()
                    }
                  }}
                />
                <Dropdown
                  value={secondaryKeySearchType}
                  options={searchTypes}
                  onChange={(e) => setSecondaryKeySearchType(e.value)}
                  placeholder="Select Search Type"
                  className="p-mr-2"
                />
              </>
            )}
            <div>
              <Checkbox
                inputId="secondaryCaseInsensitive"
                checked={isSecondaryCaseInsensitive}
                onChange={(e) => setIsSecondaryCaseInsensitive(e.checked)}
              />
              <label htmlFor="secondaryCaseInsensitive"> Case Insensitive</label>
            </div>
            <Button
              label={isSecondaryKeySearchEnabled ? "Remove Secondary Key Search" : "Add Secondary Key Search"}
              icon={isSecondaryKeySearchEnabled ? "pi pi-minus" : "pi pi-plus"}
              onClick={toggleSecondaryKeySearch}
            />
          </div>
          <div className="flex space-x-2">
            <InputText
              value={secondarySearchTerm}
              onChange={(e) => setSecondarySearchTerm(e.target.value)}
              placeholder="Secondary search values..."
              className="p-mr-2"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && secondarySearchTerm.trim() !== '') {
                  handleSearch()
                }
              }}
            />
            <Dropdown
              value={secondaryPropertyType}
              options={propertyTypes}
              onChange={(e) => setSecondaryPropertyType(e.value)}
              placeholder="Select a Type"
              className="p-mr-2"
            />
            {secondaryPropertyType === 'string' && (
              <Dropdown
                value={secondarySearchType}
                options={searchTypes}
                onChange={(e) => setSecondarySearchType(e.value)}
                placeholder="Select Search Type"
                className="p-mr-2"
              />
            )}
            {secondaryPropertyType === 'number' && (
              <Dropdown
                value={secondaryNumericCondition}
                options={numericConditions}
                onChange={(e) => setSecondaryNumericCondition(e.value)}
                placeholder="Select Condition"
                className="p-mr-2"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
