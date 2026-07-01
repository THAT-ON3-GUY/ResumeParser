import { useMemo, useState } from 'react'

import { ConfidenceBadge, LinkedInBadge, LicenseBadge } from './Badges.jsx'
import {
  educationSummary,
  firstLicense,
  hasLinkedInFound,
  locationSummary,
  sortRows
} from '../lib/tableSort.js'
import { getCurrentEmployer } from '../lib/parsedResume.js'
import { UPLOAD_STATUS, uploadStatusLabel, isProcessingStatus } from '../lib/uploadStatus.js'

const COLUMNS = [
  { key: 'fileName', label: 'File name' },
  { key: 'summaryTitle', label: 'Summary title' },
  { key: 'employer', label: 'Most recent employer' },
  { key: 'title', label: 'Most recent title' },
  { key: 'location', label: 'Location' },
  { key: 'education', label: 'Education' },
  { key: 'license', label: 'Licenses' },
  { key: 'years', label: 'Years exp.' },
  { key: 'linkedin', label: 'LinkedIn found' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'actions', label: 'Actions', static: true }
]

function rowStatusLabel(row) {
  return uploadStatusLabel(row)
}

export default function ResultsTable({
  rows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
  onDeleteRow,
  onRerunSearch,
  onRetryRow,
  onExportRow,
  searchQuery
}) {
  const [sortKey, setSortKey] = useState('fileName')
  const [sortDir, setSortDir] = useState('asc')

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const p = row.parsed
      const haystack = [
        row.fileName,
        p?.summary_title,
        p?.location_hints?.join(' '),
        educationSummary(p?.education),
        ...(p?.skills ?? [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, searchQuery])

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir]
  )

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((row) => selectedIds.has(row.id))

  const handleSort = (key, staticCol) => {
    if (staticCol) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'confidence' ? 'desc' : 'asc')
    }
  }

  if (!rows.length) {
    return (
      <div
        data-testid="empty-table"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: 'var(--text-muted)'
        }}
      >
        <i className="ti ti-file-search" style={{ fontSize: '40px' }} aria-hidden="true" />
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>
          No resumes yet
        </p>
        <p style={{ fontSize: '12px', margin: 0 }}>Drop files above to get started</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper" data-testid="results-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: 28, cursor: 'default' }}>
              <span
                role="checkbox"
                aria-checked={allSelected}
                className={`row-checkbox ${allSelected ? 'checked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelectAll(sortedRows.map((r) => r.id), !allSelected)
                }}
                data-testid="row-checkbox-all"
              />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                style={col.static ? { cursor: 'default' } : undefined}
                onClick={() => handleSort(col.key, col.static)}
                data-testid={col.static ? undefined : `sort-${col.key}`}
                aria-sort={!col.static && sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {col.label}
                {!col.static && sortKey === col.key ? (
                  <i className="ti ti-chevron-down" aria-hidden="true" />
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const p = row.parsed
            const cur = p ? getCurrentEmployer(p) : null
            const selected = selectedIds.has(row.id)
            const linkedInFound = hasLinkedInFound(row)
            const license = row.status === UPLOAD_STATUS.DONE ? firstLicense(p?.licenses_certifications) : null
            const done = row.status === UPLOAD_STATUS.DONE && p

            return (
              <tr
                key={row.id}
                className={selected ? 'row-selected' : ''}
                onClick={() => done && onOpenDetail?.(row.id)}
                data-testid="result-row"
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <span
                    role="checkbox"
                    aria-checked={selected}
                    className={`row-checkbox ${selected ? 'checked' : ''}`}
                    onClick={() => onToggleSelect(row.id)}
                    data-testid={`row-checkbox-${row.id}`}
                  />
                </td>
                <td className="td-filename" title={row.fileName}>
                  <span>{row.fileName}</span>
                  {row.lowTextWarning ? (
                    <span
                      className="badge badge-medium"
                      style={{ marginLeft: 6 }}
                      data-testid="upload-warning"
                      title={row.lowTextWarning}
                    >
                      Scanned?
                    </span>
                  ) : null}
                </td>
                <td className="td-muted">{done ? p.summary_title || '—' : '…'}</td>
                <td className="td-muted">{done ? cur?.company || '—' : '…'}</td>
                <td className="td-muted">{done ? cur?.title || '—' : '…'}</td>
                <td className="td-muted">{done ? locationSummary(p.location_hints) : '…'}</td>
                <td className="td-muted">{done ? educationSummary(p.education) : '…'}</td>
                <td>
                  {done ? <LicenseBadge license={license} testId={`badge-license-${row.id}`} /> : '…'}
                </td>
                <td className="td-muted">{done ? (p.years_experience ?? '—') : '…'}</td>
                <td>
                  {done ? (
                    <LinkedInBadge found={linkedInFound} testId={`badge-linkedin-${row.id}`} />
                  ) : (
                    '…'
                  )}
                </td>
                <td>
                  {done ? (
                    <ConfidenceBadge score={p.parsing_confidence || 'low'} testId={`badge-confidence-${row.id}`} />
                  ) : (
                    '…'
                  )}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">
                    {done ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="View detail"
                        onClick={() => onOpenDetail?.(row.id)}
                        data-testid="view-detail-btn"
                      >
                        <i className="ti ti-eye" aria-hidden="true" />
                      </button>
                    ) : null}
                    {row.status === UPLOAD_STATUS.ERROR && row.filePath ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Retry upload"
                        onClick={() => onRetryRow?.(row)}
                        data-testid="row-retry"
                      >
                        <i className="ti ti-refresh" aria-hidden="true" />
                      </button>
                    ) : null}
                    {row.dbId != null && done ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Re-run search"
                        onClick={() => onRerunSearch?.(row)}
                        data-testid={`row-action-search-${row.id}`}
                      >
                        <i className="ti ti-search" aria-hidden="true" />
                      </button>
                    ) : null}
                    {row.dbId != null && done ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Export row"
                        onClick={() => onExportRow?.(row)}
                        data-testid={`row-action-export-${row.id}`}
                      >
                        <i className="ti ti-download" aria-hidden="true" />
                      </button>
                    ) : null}
                    {!isProcessingStatus(row.status) ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Delete"
                        onClick={() => onDeleteRow?.(row)}
                        data-testid="result-delete"
                      >
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    ) : null}
                    <span data-testid="result-status" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {rowStatusLabel(row)}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
