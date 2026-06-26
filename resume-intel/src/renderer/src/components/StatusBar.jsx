export default function StatusBar({ candidateCount, linkedInCount, aiModel, lastUpdated }) {
  return (
    <footer className="status-bar" data-testid="status-bar">
      <span>
        <span className="status-dot" aria-hidden="true" />
        {candidateCount} candidate{candidateCount === 1 ? '' : 's'} · {linkedInCount} LinkedIn match
        {linkedInCount === 1 ? '' : 'es'} · Parsed with {aiModel} · Last updated {lastUpdated}
      </span>
      <span className="status-bar-right">Resume Intel</span>
    </footer>
  )
}
