export default function Topbar({
  title,
  searchQuery,
  onSearchChange,
  onUploadClick,
  onExportClick,
  exportDisabled
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <label className="search-box">
        <i className="ti ti-search" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search candidates…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="search-input"
        />
      </label>
      <button
        type="button"
        className="btn"
        onClick={onExportClick}
        disabled={exportDisabled}
        data-testid="btn-export"
      >
        <i className="ti ti-download" aria-hidden="true" />
        Export
      </button>
      <button type="button" className="btn btn-primary" onClick={onUploadClick} data-testid="btn-upload">
        <i className="ti ti-upload" aria-hidden="true" />
        Upload
      </button>
    </header>
  )
}
