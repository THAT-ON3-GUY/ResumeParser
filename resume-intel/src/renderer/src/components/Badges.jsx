export function ConfidenceBadge({ score, testId }) {
  const raw = String(score || 'low').toLowerCase()
  const s = raw === 'insufficient_data' ? 'missing' : raw
  const label =
    raw === 'insufficient_data'
      ? 'Insufficient data'
      : s.charAt(0).toUpperCase() + s.slice(1)
  return (
    <span className={`badge badge-${s}`} data-testid={testId}>
      {label}
    </span>
  )
}

export function LinkedInBadge({ found, testId }) {
  return (
    <span className={`badge ${found ? 'badge-found' : 'badge-missing'}`} data-testid={testId}>
      {found ? (
        <>
          <i className="ti ti-check" aria-hidden="true" /> Found
        </>
      ) : (
        'Not found'
      )}
    </span>
  )
}

export function LicenseBadge({ license, testId }) {
  if (!license) {
    return (
      <span className="badge badge-missing" data-testid={testId}>
        None
      </span>
    )
  }
  return (
    <span className="badge badge-found" data-testid={testId}>
      {license}
    </span>
  )
}
