import { useState } from 'react'

export default function ExportBar({
  disabled,
  selectedDbIds,
  selectedCount,
  onExportComplete
}) {
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (path) => {
    const fileName = path.split(/[/\\]/).pop()
    const message = `Exported to Downloads/${fileName}`
    setToast(message)
    onExportComplete?.(path)
    window.setTimeout(() => setToast(null), 4000)
  }

  const runExport = async (format, candidateIds) => {
    setExporting(true)
    setToast(null)
    try {
      const result =
        format === 'excel'
          ? await window.electron.exportExcel(candidateIds)
          : await window.electron.exportCsv(candidateIds)
      if (result?.path) showToast(result.path)
    } catch (err) {
      console.error('[ExportBar] export failed', err)
      setToast(err?.message ?? 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="export-bar"
      data-testid="export-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--surface-1)',
        flexWrap: 'wrap'
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Export all</span>
      <button
        type="button"
        className="btn"
        disabled={disabled || exporting}
        onClick={() => runExport('csv', null)}
        data-testid="export-all-csv"
      >
        CSV
      </button>
      <button
        type="button"
        className="btn"
        disabled={disabled || exporting}
        onClick={() => runExport('excel', null)}
        data-testid="export-all-excel"
      >
        Excel
      </button>

      {selectedCount > 0 ? (
        <>
          <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled || exporting}
            onClick={() => runExport('csv', selectedDbIds)}
            data-testid="export-selected-csv"
          >
            Export Selected ({selectedCount}) CSV
          </button>
          <button
            type="button"
            className="btn"
            disabled={disabled || exporting}
            onClick={() => runExport('excel', selectedDbIds)}
            data-testid="export-selected-excel"
          >
            Export Selected ({selectedCount}) Excel
          </button>
        </>
      ) : null}

      {exporting ? (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }} data-testid="export-spinner">
          Exporting…
        </span>
      ) : null}

      {toast ? (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            color: 'var(--badge-found-text)',
            background: 'var(--badge-found-bg)',
            padding: '4px 10px',
            borderRadius: 'var(--radius)'
          }}
          data-testid="export-toast"
          role="status"
        >
          {toast}
        </span>
      ) : null}
    </div>
  )
}
