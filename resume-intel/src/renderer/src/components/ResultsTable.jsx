import {
  getCurrentEmployer,
  getAllEmployers,
  joinList
} from '../lib/parsedResume.js'

function cell(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function truncate(s, max = 48) {
  const t = cell(s)
  if (t === '—') return t
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function educationSummary(edu) {
  if (!Array.isArray(edu) || !edu.length) return '—'
  const e = edu[0]
  const parts = [e.degree, e.field].filter(Boolean).join(', ')
  const school = e.school || '—'
  const yr = e.graduation_year != null ? ` (${e.graduation_year})` : ''
  return truncate(`${parts ? `${parts} @ ` : ''}${school}${yr}`, 56)
}

function educationTitleAttr(edu) {
  if (!Array.isArray(edu) || !edu.length) return ''
  const e = edu[0]
  return [e.degree, e.field, e.school, e.graduation_year].filter((x) => x != null && x !== '').join(' · ')
}

function licensesSummary(lic) {
  if (!Array.isArray(lic) || !lic.length) return '—'
  return truncate(lic.map((l) => l.name).filter(Boolean).join(', '), 40)
}

function confidenceClass(conf) {
  const c = String(conf || 'low').toLowerCase()
  if (c === 'high') return 'conf-high'
  if (c === 'medium') return 'conf-medium'
  return 'conf-low'
}

export default function ResultsTable({ rows, onOpenDetail, onDeleteRow }) {
  if (!rows.length) {
    return (
      <p className="empty-table" data-testid="empty-table">
        No files yet. Upload resumes above.
      </p>
    )
  }

  return (
    <div className="table-wrap table-wrap-wide" data-testid="results-table">
      <table className="results-table results-table-dense">
        <thead>
          <tr>
            <th>File</th>
            <th>Summary title</th>
            <th>Employer</th>
            <th>Title</th>
            <th>Location</th>
            <th>Education</th>
            <th>Licenses</th>
            <th>Yrs exp</th>
            <th>Skills</th>
            <th>Confidence</th>
            <th>Detail</th>
            <th>Delete</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const p = row.parsed
            const cur = p ? getCurrentEmployer(p) : null
            const loc = p ? joinList(p.location_hints) : ''
            const edu = p ? educationSummary(p.education) : '—'
            const lic = p ? licensesSummary(p.licenses_certifications) : '—'
            const skillsFull = p && Array.isArray(p.skills) ? joinList(p.skills) : ''
            const skills = truncate(skillsFull, 64)
            const conf = p?.parsing_confidence
            const summaryTitle = p?.summary_title
            const allEmps = p ? getAllEmployers(p) : []
            const legacyTop = p?.previous_employers?.[0]

            const employerCell =
              cur?.company ?? legacyTop?.company ?? (allEmps[0]?.company || '—')
            const titleCell = cur?.title ?? legacyTop?.title ?? (allEmps[0]?.title || '—')

            return (
              <tr key={row.id} data-testid="result-row">
                <td className="mono col-file" title={row.fileName}>
                  {truncate(row.fileName, 28)}
                </td>
                <td className="mono col-summary" title={summaryTitle || ''}>
                  {row.status === 'done' ? truncate(summaryTitle, 40) : '…'}
                </td>
                <td className="mono" title={employerCell}>
                  {row.status === 'done' ? truncate(employerCell, 28) : '…'}
                </td>
                <td className="mono" title={titleCell}>
                  {row.status === 'done' ? truncate(titleCell, 32) : '…'}
                </td>
                <td className="mono col-loc" title={loc}>
                  {row.status === 'done' ? truncate(loc, 36) : '…'}
                </td>
                <td className="mono col-edu" title={row.status === 'done' && p ? educationTitleAttr(p.education) : ''}>
                  {row.status === 'done' ? edu : '…'}
                </td>
                <td className="mono" title={lic}>
                  {row.status === 'done' ? lic : '…'}
                </td>
                <td className="mono">
                  {row.status === 'done' ? cell(p?.years_experience) : '…'}
                </td>
                <td className="mono col-skills" title={skillsFull}>
                  {row.status === 'done' ? skills : '…'}
                </td>
                <td>
                  {row.status === 'done' && conf ? (
                    <span className={`conf-badge ${confidenceClass(conf)}`}>{conf}</span>
                  ) : row.status === 'done' ? (
                    <span className="conf-badge conf-low">—</span>
                  ) : (
                    '…'
                  )}
                </td>
                <td>
                  {row.status === 'done' && p ? (
                    <button
                      type="button"
                      className="btn-detail"
                      onClick={() => onOpenDetail?.(row.id)}
                      data-testid="view-detail-btn"
                    >
                      View full detail
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {row.status !== 'parsing' ? (
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => onDeleteRow?.(row)}
                      title="Remove from database"
                      data-testid="result-delete"
                    >
                      Delete
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td data-testid="result-status">
                  {row.status === 'parsing' && <span className="status parsing">Parsing…</span>}
                  {row.status === 'done' && <span className="status done">Done</span>}
                  {row.status === 'error' && (
                    <span className="status error" title={row.error}>
                      Error: {row.error}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
