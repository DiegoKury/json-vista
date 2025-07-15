import React from 'react'
import { Dialog } from 'primereact/dialog'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'

const DistinctValuesDialog = ({
  visible,
  onHide,
  cardData,
  handleCopyToClipboard,
  toast,
  rowCount,
  valueSum
}) => {
  return (
    <Dialog header={cardData.title} visible={visible} className="distinct-values-dialog" onHide={onHide}>
      <DataTable value={cardData.data} className="distinct-value-table">
        <Column sortable field="name" header={`Value (${rowCount})`}></Column>
        <Column sortable field="count" header={`Count (${valueSum})`}></Column>
      </DataTable>
      <Button 
        icon="pi pi-copy" 
        label="Copy to CSV" 
        onClick={handleCopyToClipboard} 
        tooltip="Copy the result set to CSV format" 
        tooltipOptions={{ position: 'top' }}
        style={{ marginTop: '1rem' }}
      />
      <Toast ref={toast} />
    </Dialog>
  )
}

export default DistinctValuesDialog
