export default function Sidebar({
  view,
  onNavigate,
  onUploadClick,
  filters,
  onFilterChange,
  filterCounts
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-name">
          <i className="ti ti-file-search" aria-hidden="true" /> Resume Intel
        </div>
        <div className="sidebar-logo-sub">Local candidate research</div>
      </div>

      <nav className="sidebar-nav">
        <button
          type="button"
          className={view === 'candidates' ? 'nav-item active' : 'nav-item'}
          onClick={() => onNavigate('candidates')}
          data-testid="nav-candidates"
        >
          <i className="ti ti-layout-list" aria-hidden="true" />
          Candidates
        </button>
        <button
          type="button"
          className="nav-item"
          onClick={onUploadClick}
          data-testid="nav-upload"
        >
          <i className="ti ti-upload" aria-hidden="true" />
          Upload resumes
        </button>
        <button
          type="button"
          className={view === 'settings' ? 'nav-item active' : 'nav-item'}
          onClick={() => onNavigate('settings')}
          data-testid="nav-settings"
        >
          <i className="ti ti-settings" aria-hidden="true" />
          Settings
        </button>
      </nav>

      {view === 'candidates' ? (
        <>
          <div className="sidebar-section-label">Filters</div>
          <button
            type="button"
            className="filter-chip"
            style={
              filters.mode === 'all'
                ? { background: 'var(--bg-accent)', color: 'var(--text-accent)' }
                : undefined
            }
            onClick={() => onFilterChange('all')}
          >
            <span>All candidates</span>
            <span className="filter-chip-count">{filterCounts.all}</span>
          </button>
          <button
            type="button"
            className="filter-chip"
            style={
              filters.mode === 'linkedin'
                ? { background: 'var(--bg-accent)', color: 'var(--text-accent)' }
                : undefined
            }
            onClick={() => onFilterChange('linkedin')}
            data-testid="filter-linkedin"
          >
            <span>LinkedIn found</span>
            <span className="filter-chip-count">{filterCounts.linkedin}</span>
          </button>
          <button
            type="button"
            className="filter-chip"
            style={
              filters.mode === 'high'
                ? { background: 'var(--bg-accent)', color: 'var(--text-accent)' }
                : undefined
            }
            onClick={() => onFilterChange('high')}
            data-testid="filter-high-confidence"
          >
            <span>High confidence</span>
            <span className="filter-chip-count">{filterCounts.high}</span>
          </button>
          <button
            type="button"
            className="filter-chip"
            style={
              filters.mode === 'licensed'
                ? { background: 'var(--bg-accent)', color: 'var(--text-accent)' }
                : undefined
            }
            onClick={() => onFilterChange('licensed')}
            data-testid="filter-licensed"
          >
            <span>Has license</span>
            <span className="filter-chip-count">{filterCounts.licensed}</span>
          </button>
        </>
      ) : null}

      <div className="sidebar-footer">
        <span className="status-dot" aria-hidden="true" />
        Ready · data stored locally
      </div>
    </aside>
  )
}
