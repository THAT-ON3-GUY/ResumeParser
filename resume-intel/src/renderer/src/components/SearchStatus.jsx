export default function SearchStatus({ message, processingCount, totalCount }) {
  if (!message || processingCount <= 0) return null

  return (
    <div className="upload-progress-bar" data-testid="upload-progress-bar" role="status">
      <i className="ti ti-loader-2 spin" aria-hidden="true" />
      <strong>Processing resumes</strong>
      <span>{message}</span>
      {totalCount > 0 ? (
        <span className="upload-progress-count">
          {processingCount} of {totalCount}
        </span>
      ) : null}
      <span data-testid="search-status" hidden>
        {message}
      </span>
    </div>
  )
}
