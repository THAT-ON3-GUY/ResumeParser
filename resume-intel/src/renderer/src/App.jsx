import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CandidateDetailDrawer from './components/CandidateDetailDrawer.jsx'
import ExportBar from './components/ExportBar.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import SearchStatus from './components/SearchStatus.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import Sidebar from './components/Sidebar.jsx'
import StatusBar from './components/StatusBar.jsx'
import Topbar from './components/Topbar.jsx'
import { candidateRecordToRow } from './lib/dbRows.js'
import { hasLicense, hasLinkedInFound } from './lib/tableSort.js'
import { UPLOAD_STATUS, LOW_TEXT_WARNING, LOW_TEXT_THRESHOLD, isProcessingStatus } from './lib/uploadStatus.js'

export default function App() {
  const [view, setView] = useState('candidates')
  const [rows, setRows] = useState([])
  const [detailRowId, setDetailRowId] = useState(null)
  const [loadingDb, setLoadingDb] = useState(true)
  const [uploadRejection, setUploadRejection] = useState(null)
  const [searchStatus, setSearchStatus] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [filters, setFilters] = useState({ mode: 'all' })
  const [settings, setSettings] = useState(null)
  const [welcomeSetup, setWelcomeSetup] = useState(false)
  const [processingTotal, setProcessingTotal] = useState(0)
  const uploadInputRef = useRef(null)

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
        if (!cancelled) {
          const s = await window.electron.getSettings()
          if (!cancelled) setSettings(s)
        }
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

  useEffect(() => {
    if (loadingDb || !settings) return
    const provider = settings.aiProvider ?? 'gemini'
    const needsGeminiKey = provider === 'gemini' && !String(settings.geminiApiKey ?? '').trim()
    if (needsGeminiKey) {
      setWelcomeSetup(true)
      setView('settings')
    } else {
      setWelcomeSetup(false)
    }
  }, [settings, loadingDb])

  useEffect(() => {
    const unsub = window.electron.onLinkedInSessionExpired?.(() => {
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          linkedinData: null,
          searchResults: row.searchResults
            ? { ...row.searchResults, linkedinSessionExpired: true }
            : row.searchResults
        }))
      )
    })
    return () => unsub?.()
  }, [])

  const filterCounts = useMemo(
    () => ({
      all: rows.length,
      linkedin: rows.filter((r) => hasLinkedInFound(r)).length,
      high: rows.filter((r) => String(r.parsed?.parsing_confidence).toLowerCase() === 'high').length,
      licensed: rows.filter((r) => hasLicense(r)).length
    }),
    [rows]
  )

  const filteredRows = useMemo(() => {
    if (filters.mode === 'linkedin') return rows.filter((r) => hasLinkedInFound(r))
    if (filters.mode === 'high') {
      return rows.filter((r) => String(r.parsed?.parsing_confidence).toLowerCase() === 'high')
    }
    if (filters.mode === 'licensed') return rows.filter((r) => hasLicense(r))
    return rows
  }, [rows, filters.mode])

  const processingCount = rows.filter((r) => isProcessingStatus(r.status)).length

  const linkedInMatchCount = rows.filter((r) => r.linkedinData).length

  const openUploadDialog = useCallback(() => {
    uploadInputRef.current?.click()
  }, [])

  const processOneFile = useCallback(async (item) => {
    const patchRow = (patch) => {
      setRows((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...patch } : row)))
    }

    try {
      patchRow({ status: UPLOAD_STATUS.QUEUED, error: null, lowTextWarning: null })
      patchRow({ status: UPLOAD_STATUS.EXTRACTING })
      const { charCount } = await window.electron.readResume(item.filePath)
      const lowTextWarning = charCount < LOW_TEXT_THRESHOLD ? LOW_TEXT_WARNING : null

      patchRow({ status: UPLOAD_STATUS.PARSING, lowTextWarning })
      const result = await window.electron.parseResume(item.filePath)

      patchRow({
        id: String(result.id),
        dbId: result.id,
        status: UPLOAD_STATUS.DONE,
        parsed: result.parsed,
        searchResults: result.searchResults ?? null,
        linkedinData: result.linkedinData ?? null,
        publicRecords: result.publicRecords ?? null,
        aiSummary: result.aiSummary ?? null,
        aiProvider: result.aiProvider ?? 'gemini',
        lowTextWarning,
        error: null
      })
    } catch (err) {
      const message = err?.message ?? String(err)
      console.error('[App] upload failed', item.fileName, message)
      patchRow({ status: UPLOAD_STATUS.ERROR, error: message, parsed: null })
    }
  }, [])

  const handleFilesSelected = useCallback(
    async (files) => {
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
      setView('candidates')

      const pending = list.map((file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        filePath: window.electron.webUtils.getPathForFile(file),
        status: UPLOAD_STATUS.QUEUED,
        parsed: null,
        error: null,
        dbId: null,
        lowTextWarning: null
      }))

      setProcessingTotal(pending.length)

      setRows((prev) => [
        ...prev,
        ...pending.map(({ id, fileName, filePath, status, parsed, error, dbId, lowTextWarning }) => ({
          id,
          fileName,
          filePath,
          status,
          parsed,
          error,
          dbId,
          lowTextWarning
        }))
      ])

      const currentSettings = await window.electron.getSettings()
      setSettings(currentSettings)
      setSearchStatus(
        currentSettings.linkedinConnected
          ? 'Parsing resume & checking LinkedIn…'
          : 'Parsing resume & searching…'
      )

      for (const item of pending) {
        await processOneFile(item)
      }

      setSearchStatus(null)
      setProcessingTotal(0)
    },
    [processOneFile]
  )

  const handleRetryRow = useCallback(
    async (row) => {
      if (!row.filePath) return
      setSearchStatus('Retrying failed upload…')
      await processOneFile({
        id: row.id,
        fileName: row.fileName,
        filePath: row.filePath
      })
      setSearchStatus(null)
    },
    [processOneFile]
  )

  const handleUploadInputChange = (e) => {
    const files = e.target.files
    if (files?.length) handleFilesSelected(files)
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer?.files
    if (files?.length) handleFilesSelected(files)
  }

  const handleDeleteRow = useCallback(
    async (row) => {
      if (row.dbId == null) {
        setRows((prev) => prev.filter((r) => r.id !== row.id))
        return
      }
      try {
        await window.electron.deleteCandidate(row.dbId)
        setRows((prev) => prev.filter((r) => r.id !== row.id))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
        if (detailRowId === row.id) setDetailRowId(null)
      } catch (err) {
        console.error('[App] deleteCandidate failed', err)
      }
    },
    [detailRowId]
  )

  const handleRerunSearch = useCallback(async (row) => {
    if (row.dbId == null) return
    try {
      setSearchStatus('Re-running search…')
      const outcome = await window.electron.runSearch(row.dbId)
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                searchResults: outcome.searchResults ?? r.searchResults,
                linkedinData: outcome.linkedinData ?? null,
                publicRecords: outcome.publicRecords ?? r.publicRecords,
                aiSummary: outcome.aiSummary ?? r.aiSummary,
                aiProvider: outcome.aiProvider ?? r.aiProvider
              }
            : r
        )
      )
    } catch (err) {
      console.error('[App] runSearch failed', err)
    } finally {
      setSearchStatus(null)
    }
  }, [])

  const handleExportRow = useCallback(async (row) => {
    if (row.dbId == null) return
    try {
      await window.electron.exportRow(row.dbId)
    } catch (err) {
      console.error('[App] exportRow failed', err)
    }
  }, [])

  const handleClearAllData = useCallback(async () => {
    setRows([])
    setDetailRowId(null)
    setSelectedIds(new Set())
    await loadCandidates()
  }, [loadCandidates])

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback((ids, select) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (select) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  const aiModelLabel =
    settings?.aiProvider === 'claude'
      ? 'Claude'
      : settings?.geminiModel?.replace(/^gemini-/i, 'Gemini ') || 'Gemini 1.5 Flash'

  const selectedDbIds = useMemo(
    () =>
      rows
        .filter((row) => selectedIds.has(row.id) && row.dbId != null && row.status === UPLOAD_STATUS.DONE)
        .map((row) => row.dbId),
    [rows, selectedIds]
  )

  const exportableCount = rows.filter((row) => row.status === UPLOAD_STATUS.DONE && row.dbId != null).length

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onNavigate={setView}
        onUploadClick={openUploadDialog}
        filters={filters}
        onFilterChange={(mode) => setFilters({ mode })}
        filterCounts={filterCounts}
      />

      <main className="main-content" onDragOver={handleDragOver} onDrop={handleDrop}>
        <input
          ref={uploadInputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            overflow: 'hidden'
          }}
          onChange={handleUploadInputChange}
          data-testid="upload-input"
        />

        {view === 'settings' ? (
          <div className="main-scroll" data-testid="settings-view">
            <Topbar title="Settings" searchQuery="" onSearchChange={() => {}} onUploadClick={openUploadDialog} />
            <SettingsPanel
              onClearAllData={handleClearAllData}
              onBack={() => setView('candidates')}
              showWelcomeBanner={welcomeSetup}
            />
            <StatusBar
              candidateCount={rows.length}
              linkedInCount={linkedInMatchCount}
              aiModel={aiModelLabel}
              lastUpdated="just now"
            />
          </div>
        ) : (
          <div className="main-scroll" data-testid="candidates-view">
            <Topbar
              title="Candidates"
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onUploadClick={openUploadDialog}
            />

            <ExportBar
              disabled={exportableCount === 0}
              selectedDbIds={selectedDbIds}
              selectedCount={selectedDbIds.length}
            />

            {uploadRejection ? (
              <p
                data-testid="upload-rejection"
                role="alert"
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  color: 'var(--badge-low-text)',
                  background: 'var(--badge-low-bg)',
                  borderBottom: '0.5px solid var(--border)',
                  margin: 0
                }}
              >
                {uploadRejection}
              </p>
            ) : null}

            <SearchStatus
              message={searchStatus}
              processingCount={processingCount}
              totalCount={processingTotal || processingCount}
            />

            {loadingDb ? (
              <p style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Loading saved candidates…
              </p>
            ) : null}

            <ResultsTable
              rows={filteredRows}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onOpenDetail={setDetailRowId}
              onDeleteRow={handleDeleteRow}
              onRerunSearch={handleRerunSearch}
              onRetryRow={handleRetryRow}
              onExportRow={handleExportRow}
              searchQuery={searchQuery}
            />

            <StatusBar
              candidateCount={rows.length}
              linkedInCount={linkedInMatchCount}
              aiModel={aiModelLabel}
              lastUpdated="just now"
            />
          </div>
        )}

        {detailRow?.status === UPLOAD_STATUS.DONE && detailRow.parsed ? (
          <CandidateDetailDrawer row={detailRow} onClose={() => setDetailRowId(null)} />
        ) : null}
      </main>
    </div>
  )
}
