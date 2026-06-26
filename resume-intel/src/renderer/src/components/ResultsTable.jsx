import { useMemo, useState } from 'react'
import { getCurrentEmployer } from '../lib/parsedResume.js'
import { ConfidenceBadge, LinkedInBadge, LicenseBadge } from './Badges.jsx'

const COLUMNS = [
  { key: 'fileName', label: 'File name' },
  { key: 'role', label: 'Role' },
  { key: 'employer', label: 'Employer' },
  { key: 'education', label: 'Education' },
  { key: 'license', label: 'License', static: true },
  { key: 'years', label: 'Exp' },
  { key: 'linkedin', label: 'LinkedIn', static: true },
  { key: 'confidence', label: 'Confidence', static: true },
  { key: 'actions', label: 'Actions', static: true }
]

function educationSummary(edu) {
  if (!Array.isArray(edu) || !edu.length) return '—'
  const e = edu[0]
  const parts = [e.degree, e.field].filter(Boolean).join(', ')
  const school = e.school || '—'
  const yr = e.graduation_year != null ? ` (${e.graduation_year})` : ''
  return `${parts ? `${parts} @ ` : ''}${school}${yr}`
}

function firstLicense(licenses) {
  if (!Array.isArray(licenses) || !licenses.length) return null
  const item = licenses[0]
  if (typeof item === 'string') return item
  return item?.name || null
}

function rowStatusLabel(row) {
  if (row.status === 'parsing') return 'Parsing…'
  if (row.status === 'error') return `Error: ${row.error}`
  return 'Done'
}

function sortValue(row, key) {
  const p = row.parsed
  const cur = p ? getCurrentEmployer(p) : null
  switch (key) {
    case 'fileName':
      return row.fileName
    case 'role':
      return cur?.title ?? ''
    case 'employer':
      return cur?.company ?? ''
    case 'education':
      return educationSummary(p?.education)
    case 'years':
      return p?.years_experience ?? -1
    case 'confidence':
      return p?.parsing_confidence ?? ''
    default:
      return ''
  }
}

export default function ResultsTable({
  rows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
  onDeleteRow,
  onRerunSearch,
  searchQuery
}) {
  const [sortKey, setSortKey] = useState('fileName')
  const [sortDir, setSortDir] = useState('asc')

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const p = row.parsed
      const cur = p ? getCurrentEmployer(p) : null
      const haystack = [
        row.fileName,
        cur?.title,
        cur?.company,
        educationSummary(p?.education),
        ...(p?.skills ?? [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, searchQuery])

  const sortedRows = useMemo(() => {
    const list = [...filteredRows]
    list.sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      if (av === bv) return 0
      if (av == null || av === '') return 1
      if (bv == null || bv === '') return -1
      const cmp = av > bv ? 1 : -1
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredRows, sortKey, sortDir])

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((row) => selectedIds.has(row.id))

  const handleSort = (key, staticCol) => {
    if (staticCol) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
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
          No candidates yet
        </p>
        <p style={{ fontSize: '12px', margin: 0 }}>Drop resume files above to get started</p>
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
            const linkedInFound = Boolean(row.linkedinData)
            const license = row.status === 'done' ? firstLicense(p?.licenses_certifications) : null

            return (
              <tr
                key={row.id}
                className={selected ? 'row-selected' : ''}
                onClick={() => row.status === 'done' && p && onOpenDetail?.(row.id)}
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
                  {row.fileName}
                </td>
                <td className="td-muted">
                  {row.status === 'done' ? cur?.title || '—' : '…'}
                </td>
                <td className="td-muted">
                  {row.status === 'done' ? cur?.company || '—' : '…'}
                </td>
                <td className="td-muted">
                  {row.status === 'done' ? educationSummary(p?.education) : '…'}
                </td>
                <td>
                  {row.status === 'done' ? (
                    <LicenseBadge license={license} testId={`badge-license-${row.id}`} />
                  ) : (
                    '…'
                  )}
                </td>
                <td className="td-muted">
                  {row.status === 'done' ? (p?.years_experience ?? '—') : '…'}
                </td>
                <td>
                  {row.status === 'done' ? (
                    <LinkedInBadge found={linkedInFound} testId={`badge-linkedin-${row.id}`} />
                  ) : (
                    '…'
                  )}
                </td>
                <td>
                  {row.status === 'done' && p?.parsing_confidence ? (
                    <ConfidenceBadge score={p.parsing_confidence} testId={`badge-confidence-${row.id}`} />
                  ) : row.status === 'done' ? (
                    <ConfidenceBadge score="low" testId={`badge-confidence-${row.id}`} />
                  ) : (
                    '…'
                  )}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">
                    {row.status === 'done' && p ? (
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
                    {row.dbId != null ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Re-run search"
                        onClick={() => onRerunSearch?.(row)}
                        data-testid={`row-action-search-${row.id}`}
                      >
                        <i className="ti ti-refresh" aria-hidden="true" />
                      </button>
                    ) : null}
                    {row.status !== 'parsing' ? (
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
