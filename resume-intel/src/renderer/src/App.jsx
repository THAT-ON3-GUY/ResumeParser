import { useCallback, useEffect, useMemo, useState } from 'react'
import UploadZone from './components/UploadZone.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import CandidateDetailDrawer from './components/CandidateDetailDrawer.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import SearchStatus from './components/SearchStatus.jsx'
import { candidateRecordToRow } from './lib/dbRows.js'

export default function App() {
  const [view, setView] = useState('candidates')
  const [rows, setRows] = useState([])
  const [detailRowId, setDetailRowId] = useState(null)
  const [loadingDb, setLoadingDb] = useState(true)
  const [uploadRejection, setUploadRejection] = useState(null)
  const [searchStatus, setSearchStatus] = useState(null)

  const detailRow = useMemo(() => rows.find((r) => r.id === detailRowId) ?? null, [rows, detailRowId])

  const loadCandidates = useCallback(async () => {
    const records = await window.electron.getAllCandidates()
    setRows(records.map(candidateRecordToRow))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!cancelled) await loadCandidates()
      } catch (err) {
        console.error('[App] Failed to load candidates from database', err)
      } finally {
        if (!cancelled) setLoadingDb(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadCandidates])

  const handleFilesSelected = useCallback(async (files) => {
    const all = Array.from(files ?? [])
    const list = all.filter((f) => {
      const n = f.name.toLowerCase()
      return n.endsWith('.pdf') || n.endsWith('.docx')
    })

    if (list.length === 0) {
      if (all.length > 0) {
        setUploadRejection('Unsupported file type')
      }
      return
    }

    setUploadRejection(null)

    const pending = list.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      filePath: window.electron.webUtils.getPathForFile(file),
      status: 'parsing',
      parsed: null,
      error: null,
      dbId: null
    }))

    setRows((prev) => [
      ...prev,
      ...pending.map(({ id, fileName, status, parsed, error, dbId }) => ({
        id,
        fileName,
        status,
        parsed,
        error,
        dbId
      }))
    ])

    for (const item of pending) {
      try {
        setSearchStatus('Parsing resume…')
        const result = await window.electron.parseResume(item.filePath)
        if (result.searchResults) {
          setSearchStatus(
            result.linkedinData != null ? 'Checking LinkedIn…' : 'Searching DuckDuckGo…'
          )
        }
        setRows((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  id: String(result.id),
                  dbId: result.id,
                  status: 'done',
                  parsed: result.parsed,
                  searchResults: result.searchResults ?? null,
                  linkedinData: result.linkedinData ?? null,
                  error: null
                }
              : row
          )
        )
        setSearchStatus(null)
      } catch (err) {
        setSearchStatus(null)
        const message = err?.message ?? String(err)
        setRows((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, status: 'error', error: message, parsed: null } : row
          )
        )
      }
    }
  }, [])

  const handleDeleteRow = useCallback(
    async (row) => {
      if (row.dbId == null) {
        setRows((prev) => prev.filter((r) => r.id !== row.id))
        return
      }
      try {
        await window.electron.deleteCandidate(row.dbId)
        setRows((prev) => prev.filter((r) => r.id !== row.id))
        if (detailRowId === row.id) setDetailRowId(null)
      } catch (err) {
        console.error('[App] deleteCandidate failed', err)
      }
    },
    [detailRowId]
  )

  const handleClearAllData = useCallback(async () => {
    setRows([])
    setDetailRowId(null)
    await loadCandidates()
  }, [loadCandidates])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Resume Intel</div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={view === 'candidates' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('candidates')}
            data-testid="nav-candidates"
          >
            Candidates
          </button>
          <button
            type="button"
            className={view === 'settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('settings')}
            title="Settings"
            aria-label="Settings"
            data-testid="nav-settings"
          >
            ⚙ Settings
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {view === 'settings' ? (
          <SettingsPanel onClearAllData={handleClearAllData} onBack={() => setView('candidates')} />
        ) : (
          <div data-testid="candidates-view">
            <header className="app-header">
              <h1>Candidates</h1>
              <p className="subtitle">
                Drop PDF or Word resumes to extract structured fields — results saved locally
              </p>
            </header>
            <UploadZone onFilesSelected={handleFilesSelected} rejectionMessage={uploadRejection} />
            <SearchStatus message={searchStatus} />
            {loadingDb ? <p className="empty-table">Loading saved candidates…</p> : null}
            <ResultsTable rows={rows} onOpenDetail={setDetailRowId} onDeleteRow={handleDeleteRow} />
            {detailRow?.status === 'done' && detailRow.parsed && (
              <CandidateDetailDrawer row={detailRow} onClose={() => setDetailRowId(null)} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
