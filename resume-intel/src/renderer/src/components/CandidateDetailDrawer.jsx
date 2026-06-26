import { useEffect } from 'react'
import {
  getAllEmployers,
  getCurrentEmployer,
  formatYearRange,
  joinList
} from '../lib/parsedResume.js'

function Section({ title, children }) {
  return (
    <section className="drawer-section">
      <h3 className="drawer-section-title">{title}</h3>
      {children}
    </section>
  )
}

function EmployerTimeline({ employers }) {
  if (!employers?.length) {
    return <p className="drawer-muted">No employers extracted.</p>
  }
  return (
    <ol className="employer-timeline">
      {employers.map((job, i) => (
        <li key={i} className="employer-timeline-item">
          <div className="employer-timeline-marker" aria-hidden />
          <div className="employer-timeline-body">
            <div className="employer-timeline-company">{job.company || '—'}</div>
            <div className="employer-timeline-title">{job.title || '—'}</div>
            <div className="employer-timeline-dates">{formatYearRange(job.start_year, job.end_year)}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function ListBlock({ items, empty = '—' }) {
  if (!Array.isArray(items) || !items.length) return <p className="drawer-muted">{empty}</p>
  return (
    <ul className="drawer-list">
      {items.map((x, i) => (
        <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>
      ))}
    </ul>
  )
}

function EducationList({ items }) {
  if (!Array.isArray(items) || !items.length) {
    return <p className="drawer-muted">No education extracted.</p>
  }
  return (
    <ul className="drawer-list">
      {items.map((e, i) => (
        <li key={i}>
          <strong>{e.school || '—'}</strong>
          {e.degree || e.field ? (
            <>
              {' — '}
              {[e.degree, e.field].filter(Boolean).join(', ')}
            </>
          ) : null}
          {e.graduation_year != null ? ` (${e.graduation_year})` : ''}
        </li>
      ))}
    </ul>
  )
}

function LicensesList({ items }) {
  if (!Array.isArray(items) || !items.length) {
    return <p className="drawer-muted">None listed.</p>
  }
  return (
    <ul className="drawer-list">
      {items.map((L, i) => (
        <li key={i}>
          <strong>{L.name || '—'}</strong>
          {L.issuing_body ? ` — ${L.issuing_body}` : ''}
          {L.year != null ? ` (${L.year})` : ''}
        </li>
      ))}
    </ul>
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
    <div className="drawer-root" role="dialog" aria-modal="true" aria-labelledby="drawer-title" data-testid="detail-drawer">
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Close detail" />
      <aside className="drawer-panel">
        <header className="drawer-header">
          <div>
            <h2 id="drawer-title" className="drawer-title">
              {p?.summary_title || row.fileName}
            </h2>
            <p className="drawer-sub">{row.fileName}</p>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} data-testid="detail-close">
            Close
          </button>
        </header>

        <div className="drawer-scroll">
          <Section title="Summary title">
            <p className="drawer-value">{p?.summary_title || '—'}</p>
          </Section>

          <Section title="Current / most recent role">
            {cur ? (
              <div className="drawer-card">
                <div>
                  <strong>{cur.company || '—'}</strong>
                </div>
                <div>{cur.title || '—'}</div>
                <div className="drawer-muted">{formatYearRange(cur.start_year, cur.end_year)}</div>
              </div>
            ) : (
              <p className="drawer-muted">—</p>
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
              <p className="drawer-skills">{joinList(p.skills, ' · ')}</p>
            ) : (
              <p className="drawer-muted">—</p>
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
            <p className="drawer-value">{p?.pronouns ?? '—'}</p>
          </Section>

          <Section title="Years experience (estimated)">
            <p className="drawer-value">{p?.years_experience != null ? String(p.years_experience) : '—'}</p>
          </Section>

          <Section title="Contact hints (from resume text only)">
            <ListBlock items={p?.contact_hints} empty="None visible" />
          </Section>

          <Section title="Parsing confidence">
            <span className={`conf-badge conf-${(p?.parsing_confidence || 'low').toLowerCase()}`}>
              {p?.parsing_confidence || '—'}
            </span>
          </Section>

          <Section title="Search results">
            {row.searchResults?.results?.length ? (
              <ul className="search-results-list" data-testid="search-results-list">
                {row.searchResults.results.map((hit, i) => (
                  <li
                    key={i}
                    className={hit.isLinkedIn ? 'search-result-card linkedin-hit' : 'search-result-card'}
                    data-testid="search-result-card"
                    data-linkedin={hit.isLinkedIn ? 'true' : 'false'}
                  >
                    <div className="search-result-title">
                      {hit.isLinkedIn ? <span aria-hidden>in </span> : null}
                      {hit.title || hit.url || '—'}
                    </div>
                    {hit.snippet ? <p className="search-result-snippet">{hit.snippet}</p> : null}
                    {hit.url ? (
                      <button
                        type="button"
                        className="link-btn search-result-link"
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
              <p className="drawer-muted" data-testid="search-results-empty">
                {row.searchResults ? 'No public search hits yet.' : 'Search not run.'}
              </p>
            )}
            {row.searchResults?.linkedinConnectRequired ? (
              <p className="drawer-warn" data-testid="linkedin-connect-prompt" role="alert">
                Connect LinkedIn in Settings to scrape profile pages from search results.
              </p>
            ) : null}
            {row.searchResults?.linkedinSessionExpired ? (
              <p className="drawer-warn" data-testid="linkedin-session-expired" role="alert">
                LinkedIn session expired — reconnect in Settings.
              </p>
            ) : null}
          </Section>

          <Section title="LinkedIn profile">
            {row.linkedinData ? (
              <div className="drawer-card linkedin-profile-card" data-testid="linkedin-profile-card">
                <p className="drawer-value" data-testid="linkedin-profile-name">
                  {row.linkedinData.name || '—'}
                </p>
                <p data-testid="linkedin-profile-headline">{row.linkedinData.headline || '—'}</p>
                <p data-testid="linkedin-profile-location">{row.linkedinData.location || '—'}</p>
                {row.linkedinData.profileUrl ? (
                  <button
                    type="button"
                    className="link-btn"
                    data-testid="linkedin-view-profile"
                    onClick={() => window.electron.openExternal(row.linkedinData.profileUrl)}
                  >
                    View on LinkedIn
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="drawer-muted" data-testid="linkedin-profile-empty">
                {row.searchResults?.linkedinConnectRequired
                  ? 'LinkedIn not connected.'
                  : 'LinkedIn profile not found or not connected.'}
              </p>
            )}
          </Section>

          <details className="drawer-raw">
            <summary>Raw JSON</summary>
            <pre className="drawer-pre">{JSON.stringify(p, null, 2)}</pre>
          </details>
        </div>
      </aside>
    </div>
  )
}
