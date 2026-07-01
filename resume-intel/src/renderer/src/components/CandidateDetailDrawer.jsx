import { useEffect } from 'react'

import {
  getAllEmployers,
  getCurrentEmployer,
  formatYearRange,
  joinList
} from '../lib/parsedResume.js'

import { ConfidenceBadge } from './Badges.jsx'

const cardStyle = {
  padding: '8px 12px',
  background: 'var(--surface-1)',
  borderRadius: 'var(--radius)',
  border: '0.5px solid var(--border)',
  fontSize: 12
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <div className="sidebar-section-label" style={{ padding: '0 0 6px' }}>
        {title}
      </div>
      {children}
    </section>
  )
}

function EmployerTimeline({ employers }) {
  if (!employers?.length) {
    return <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No employers extracted.</p>
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }} data-testid="employer-timeline">
      {employers.map((job, i) => (
        <li key={i} style={{ marginBottom: 8 }} data-testid={`employer-timeline-item-${i}`}>
          <div style={{ fontWeight: 500 }}>{job.company || '—'}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{job.title || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {formatYearRange(job.start_year, job.end_year)}
          </div>
          <SourceQuoteDetails quote={job.source_quote} confidence={job.confidence} testId={`employer-${i}`} />
        </li>
      ))}
    </ul>
  )
}

function ListBlock({ items, empty = '—' }) {
  if (!Array.isArray(items) || !items.length) {
    return <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{empty}</p>
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
      {items.map((x, i) => (
        <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>
      ))}
    </ul>
  )
}

function EducationList({ items }) {
  if (!Array.isArray(items) || !items.length) {
    return <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No education extracted.</p>
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
      {items.map((e, i) => (
        <li key={i}>
          <strong>{e.school || '—'}</strong>
          {e.degree || e.field ? <> — {[e.degree, e.field].filter(Boolean).join(', ')}</> : null}
          {e.graduation_year != null ? ` (${e.graduation_year})` : ''}
          <SourceQuoteDetails quote={e.source_quote} confidence={e.confidence} testId={`education-${i}`} />
        </li>
      ))}
    </ul>
  )
}

function LicensesList({ items }) {
  if (!Array.isArray(items) || !items.length) {
    return <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>None listed.</p>
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
      {items.map((L, i) => (
        <li key={i}>
          <strong>{typeof L === 'string' ? L : L.name || '—'}</strong>
          {typeof L === 'object' && L.issuing_body ? ` — ${L.issuing_body}` : ''}
          {typeof L === 'object' && L.year != null ? ` (${L.year})` : ''}
          <SourceQuoteDetails quote={typeof L === 'object' ? L.source_quote : null} confidence={typeof L === 'object' ? L.confidence : null} testId={`license-${i}`} />
        </li>
      ))}
    </ul>
  )
}

function SourceQuoteDetails({ quote, confidence, testId }) {
  if (!quote) return null
  return (
    <details style={{ marginTop: 4, fontSize: 11 }} data-testid={`source-quote-${testId}`}>
      <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
        Source quote{confidence ? ` (${confidence})` : ''}
      </summary>
      <blockquote
        style={{
          margin: '4px 0 0',
          padding: '6px 8px',
          borderLeft: '2px solid var(--border)',
          color: 'var(--text-secondary)',
          fontStyle: 'italic'
        }}
        data-testid={`source-quote-text-${testId}`}
      >
        {quote}
      </blockquote>
    </details>
  )
}

export default function CandidateDetailDrawer({ row, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!row) return null

  const p = row.parsed
  const cur = getCurrentEmployer(p)
  const employers = getAllEmployers(p)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      data-testid="detail-drawer"
    >
      <button
        type="button"
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer' }}
        onClick={onClose}
        aria-label="Close detail"
        data-testid="detail-backdrop"
      />
      <aside
        style={{
          position: 'relative',
          width: 'min(520px, 100vw)',
          maxHeight: '100vh',
          background: 'var(--surface-2)',
          borderLeft: '0.5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1
        }}
      >
        <header className="topbar" style={{ flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <h2 id="drawer-title" className="topbar-title" style={{ margin: 0 }}>
              {p?.summary_title || row.fileName}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {row.fileName}
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose} data-testid="detail-close">
            Close
          </button>
        </header>

        <div style={{ overflowY: 'auto', padding: '12px 16px 16px', flex: 1 }}>
          <Section title="Summary title">
            <p style={{ margin: 0, fontSize: 14 }}>{p?.summary_title || '—'}</p>
          </Section>

          <Section title="Current / most recent role">
            {cur ? (
              <div style={cardStyle}>
                <div style={{ fontWeight: 500 }}>{cur.company || '—'}</div>
                <div>{cur.title || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatYearRange(cur.start_year, cur.end_year)}
                </div>
                <SourceQuoteDetails quote={cur.source_quote} confidence={cur.confidence} testId="current-role" />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>—</p>
            )}
          </Section>

          <Section title="Employment timeline">
            <EmployerTimeline employers={employers} />
          </Section>

          <Section title="Education">
            <EducationList items={p?.education} />
          </Section>

          <Section title="Licenses & certifications">
            <LicensesList items={p?.licenses_certifications} />
          </Section>

          <Section title="Skills">
            {Array.isArray(p?.skills) && p.skills.length ? (
              <p style={{ margin: 0, fontSize: 12 }}>{joinList(p.skills, ' · ')}</p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>—</p>
            )}
          </Section>

          <Section title="Location hints">
            <ListBlock items={p?.location_hints} empty="None" />
          </Section>

          <Section title="Associations & memberships">
            <ListBlock items={p?.associations_memberships} empty="None" />
          </Section>

          <Section title="Languages">
            <ListBlock items={p?.languages} empty="None" />
          </Section>

          <Section title="Pronouns">
            <p style={{ margin: 0, fontSize: 14 }}>{p?.pronouns ?? '—'}</p>
          </Section>

          <Section title="Years experience (estimated)">
            <p style={{ margin: 0, fontSize: 14 }}>
              {p?.years_experience != null ? String(p.years_experience) : '—'}
            </p>
          </Section>

          <Section title="Contact hints (from resume text only)">
            <ListBlock items={p?.contact_hints} empty="None visible" />
          </Section>

          <Section title="Parsing confidence">
            <ConfidenceBadge score={p?.parsing_confidence || 'low'} />
          </Section>

          <Section title="Search results">
            {row.searchResults?.source ? (
              <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-muted)' }} data-testid="search-source">
                Source: {row.searchResults.source}
              </p>
            ) : null}
            {row.searchResults?.results?.length ? (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 12 }} data-testid="search-results-list">
                {row.searchResults.results.map((hit, i) => (
                  <li
                    key={i}
                    style={{ ...cardStyle, marginBottom: 8 }}
                    data-testid="search-result-card"
                    data-linkedin={hit.isLinkedIn ? 'true' : 'false'}
                  >
                    <div style={{ fontWeight: 500 }}>
                      {hit.isLinkedIn ? <span aria-hidden>in </span> : null}
                      {hit.title || hit.url || '—'}
                    </div>
                    {hit.snippet ? (
                      <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{hit.snippet}</p>
                    ) : null}
                    {hit.url ? (
                      <button
                        type="button"
                        className="btn"
                        data-testid="search-result-link"
                        onClick={() => window.electron.openExternal(hit.url)}
                      >
                        {hit.url}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }} data-testid="search-results-empty">
                {row.searchResults ? 'No public search hits yet.' : 'Search not run.'}
              </p>
            )}
            {row.searchResults?.linkedinConnectRequired ? (
              <p
                style={{
                  margin: '8px 0 0',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--badge-medium-text)',
                  background: 'var(--badge-medium-bg)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius)'
                }}
                data-testid="linkedin-connect-prompt"
                role="alert"
              >
                Connect LinkedIn in Settings to scrape profile pages from search results.
              </p>
            ) : null}
            {row.searchResults?.linkedinSessionExpired ? (
              <p
                style={{
                  margin: '8px 0 0',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--badge-medium-text)',
                  background: 'var(--badge-medium-bg)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius)'
                }}
                data-testid="linkedin-session-expired"
                role="alert"
              >
                LinkedIn session expired — reconnect in Settings.
              </p>
            ) : null}
          </Section>

          <Section title="LinkedIn profile">
            {row.linkedinData ? (
              <div style={cardStyle} data-testid="linkedin-profile-card">
                <p style={{ margin: '0 0 4px', fontWeight: 500 }} data-testid="linkedin-profile-name">
                  {row.linkedinData.name || '—'}
                </p>
                <p style={{ margin: '0 0 4px' }} data-testid="linkedin-profile-headline">
                  {row.linkedinData.headline || '—'}
                </p>
                <p style={{ margin: '0 0 8px' }} data-testid="linkedin-profile-location">
                  {row.linkedinData.location || '—'}
                </p>
                {row.linkedinData.profileUrl ? (
                  <button
                    type="button"
                    className="btn"
                    data-testid="linkedin-view-profile"
                    onClick={() => window.electron.openExternal(row.linkedinData.profileUrl)}
                  >
                    View on LinkedIn
                  </button>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }} data-testid="linkedin-profile-empty">
                {row.searchResults?.linkedinConnectRequired
                  ? 'LinkedIn not connected.'
                  : 'LinkedIn profile not found or not connected.'}
              </p>
            )}
          </Section>

          <Section title="Public records">
            {row.publicRecords?.sourcesChecked?.length ? (
              <div style={cardStyle} data-testid="public-records-card">
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }} data-testid="public-records-sources">
                  {row.publicRecords.sourcesChecked.map((source) => {
                    const entry = row.publicRecords.results?.[source]
                    const status = entry?.status ?? (entry?.found ? 'ok' : 'empty')
                    const label =
                      status === 'timed_out'
                        ? 'Timed out'
                        : entry?.found
                          ? 'Results found'
                          : 'No matches'
                    return (
                      <li key={source} data-testid={`public-records-${source}`}>
                        <strong>{source}</strong> — {label}
                      </li>
                    )
                  })}
                </ul>
                {row.publicRecords.notes?.length ? (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12 }} data-testid="public-records-notes">
                    {row.publicRecords.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }} data-testid="public-records-empty">
                {row.publicRecords?.notes?.length
                  ? row.publicRecords.notes.join(' ')
                  : 'No public record sources matched this resume.'}
              </p>
            )}
          </Section>

          <Section title="AI summary">
            {row.aiSummary?.summary ? (
              <div style={cardStyle} data-testid="ai-summary-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="badge badge-found" data-testid="ai-summary-provider">
                    {row.aiProvider === 'claude' ? 'Claude' : 'Gemini'}
                  </span>
                  {row.aiSummary.match_confidence ? (
                    <ConfidenceBadge score={row.aiSummary.match_confidence} testId="ai-summary-confidence" />
                  ) : null}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 13 }} data-testid="ai-summary-text">
                  {row.aiSummary.summary}
                </p>
                {row.aiSummary.best_outreach_method ? (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <strong>Outreach:</strong> {row.aiSummary.best_outreach_method}
                  </p>
                ) : null}
                {Array.isArray(row.aiSummary.contact_hints) && row.aiSummary.contact_hints.length ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Contact hints</div>
                    <ListBlock items={row.aiSummary.contact_hints} empty="None" />
                  </div>
                ) : null}
                {Array.isArray(row.aiSummary.discrepancies) && row.aiSummary.discrepancies.length ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Discrepancies</div>
                    <ListBlock items={row.aiSummary.discrepancies} empty="None" />
                  </div>
                ) : null}
                {Array.isArray(row.aiSummary.recommended_search_queries) &&
                row.aiSummary.recommended_search_queries.length ? (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Recommended follow-up queries
                    </div>
                    <ListBlock items={row.aiSummary.recommended_search_queries} empty="None" />
                  </div>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }} data-testid="ai-summary-empty">
                {row.aiSummary ? 'Summary unavailable.' : 'Summary not generated yet.'}
              </p>
            )}
          </Section>

          <details style={{ marginTop: 16, fontSize: 12 }}>
            <summary>Raw JSON</summary>
            <pre
              style={{
                margin: '8px 0 0',
                padding: '8px 12px',
                background: 'var(--surface-1)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflowX: 'auto',
                fontSize: 11,
                maxHeight: 240
              }}
            >
              {JSON.stringify(p, null, 2)}
            </pre>
          </details>
        </div>
      </aside>
    </div>
  )
}
