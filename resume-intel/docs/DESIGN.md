# Resume Intel — Design System & Implementation Spec

This file is the authoritative design reference for implementing the
Resume Intel UI. Read this before writing any React component or CSS.
Every color, spacing value, and component pattern is defined here.

---

## Design Philosophy

- Flat, clean, professional HR tool aesthetic
- No gradients, no drop shadows, no decorative effects
- Minimal borders (0.5px) and generous whitespace
- Color encodes meaning only — confidence scores, status badges, accents
- Everything should feel like a native desktop app, not a web page

---

## Color Tokens

Define these as CSS custom properties in `src/renderer/src/styles/global.css`:

```css
:root {
  /* Surfaces — light mode */
  --surface-0: #f0eeea;      /* page background / sidebar */
  --surface-1: #f7f6f3;      /* table rows hover, filter chips */
  --surface-2: #ffffff;      /* topbar, cards, table header */

  /* Text */
  --text-primary: #1a1a18;
  --text-secondary: #5f5e5a;
  --text-muted: #9a9892;

  /* Borders */
  --border: rgba(0,0,0,0.1);
  --border-strong: rgba(0,0,0,0.18);

  /* Accent (blue) */
  --fill-accent: #378add;
  --bg-accent: #e6f1fb;
  --border-accent: #b5d4f4;
  --text-accent: #185fa5;
  --on-accent: #ffffff;

  /* Confidence badges */
  --badge-high-bg: #eaf3de;
  --badge-high-text: #3b6d11;
  --badge-medium-bg: #faeeda;
  --badge-medium-text: #854f0b;
  --badge-low-bg: #fcebeb;
  --badge-low-text: #a32d2d;

  /* Status badges */
  --badge-found-bg: #e1f5ee;
  --badge-found-text: #0f6e56;
  --badge-missing-bg: #f7f6f3;
  --badge-missing-text: #9a9892;

  /* Success green (status dot) */
  --color-success: #1d9e75;

  /* Radius */
  --radius: 8px;
}
```

---

## Typography

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}
```

Scale:
- 11px — metadata, status bar, table headers, filter section labels
- 12px — table cells, badges, buttons, search box
- 13px — sidebar nav items, filter chips, footer text
- 14px — topbar title, body default
- 15px — sidebar logo text

Weights: 400 (regular), 500 (medium/bold). Never use 600 or 700.

---

## App Layout

The app is a fixed-height flex container with a sidebar and main content area.

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (220px)  │  Main Content (flex: 1)          │
│                   │  ┌─────────────────────────────┐ │
│  Logo             │  │ Topbar                      │ │
│  ─────────────    │  ├─────────────────────────────┤ │
│  Nav items        │  │ Upload progress bar (cond.) │ │
│                   │  ├─────────────────────────────┤ │
│  Filter section   │  │ Results table (scrollable)  │ │
│  Filter chips     │  │                             │ │
│                   │  │                             │ │
│  ─────────────    │  ├─────────────────────────────┤ │
│  Footer           │  │ Status bar                  │ │
└─────────────────────────────────────────────────────┘
```

```css
.app-shell {
  display: flex;
  height: 100vh;
  background: var(--surface-0);
  overflow: hidden;
}
```

---

## Sidebar

```css
.sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--surface-1);
  border-right: 0.5px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}
```

### Logo block
```css
.sidebar-logo {
  padding: 0 16px 16px;
  border-bottom: 0.5px solid var(--border);
  margin-bottom: 8px;
}
.sidebar-logo-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}
.sidebar-logo-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
```

### Nav items
```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 0;
  transition: background 0.1s;
}
.nav-item:hover {
  background: var(--surface-0);
}
.nav-item.active {
  background: var(--bg-accent);
  color: var(--text-accent);
}
.nav-item i {
  font-size: 16px;
}
```

### Filter section
```css
.sidebar-section-label {
  padding: 12px 16px 6px;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.filter-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2px 12px;
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
}
.filter-chip:hover {
  background: var(--surface-2);
}
.filter-chip-count {
  font-size: 11px;
  background: var(--surface-0);
  border: 0.5px solid var(--border);
  border-radius: 10px;
  padding: 1px 6px;
  color: var(--text-muted);
}
```

### Sidebar footer
```css
.sidebar-footer {
  margin-top: auto;
  padding: 12px 16px;
  border-top: 0.5px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
}
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  margin-right: 4px;
  vertical-align: 1px;
}
```

---

## Topbar

```css
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 0.5px solid var(--border);
  background: var(--surface-2);
}
.topbar-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}
```

### Search box
```css
.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-1);
  border: 0.5px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-muted);
  width: 180px;
}
.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  color: var(--text-primary);
  width: 100%;
}
```

### Buttons
```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12px;
  border-radius: var(--radius);
  border: 0.5px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}
.btn:hover {
  background: var(--surface-1);
}
.btn-primary {
  background: var(--fill-accent);
  border-color: var(--fill-accent);
  color: var(--on-accent);
}
.btn-primary:hover {
  opacity: 0.9;
}
.btn i {
  font-size: 14px;
}
```

---

## Upload Progress Bar

Shown conditionally when files are being processed.

```css
.upload-progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-accent);
  border-bottom: 0.5px solid var(--border-accent);
  font-size: 12px;
  color: var(--text-accent);
}
.upload-progress-bar strong {
  font-weight: 500;
}
.upload-progress-count {
  margin-left: auto;
  opacity: 0.7;
}
```

---

## Results Table

```css
.table-wrapper {
  flex: 1;
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
thead th {
  position: sticky;
  top: 0;
  background: var(--surface-1);
  padding: 8px 12px;
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  color: var(--text-muted);
  border-bottom: 0.5px solid var(--border);
  white-space: nowrap;
  user-select: none;
  cursor: pointer;
}
thead th:hover {
  color: var(--text-secondary);
}
tbody tr {
  border-bottom: 0.5px solid var(--border);
  cursor: pointer;
  transition: background 0.08s;
}
tbody tr:hover {
  background: var(--surface-1);
}
tbody tr.row-selected {
  background: var(--bg-accent);
}
td {
  padding: 9px 12px;
  color: var(--text-primary);
  vertical-align: middle;
  white-space: nowrap;
}
td.td-muted {
  color: var(--text-secondary);
}
td.td-filename {
  font-weight: 500;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### Column definitions (in this order)
1. Checkbox (28px)
2. File name
3. Role (most recent title)
4. Employer (most recent)
5. Education (school, degree, year — condensed)
6. License (badge or "None")
7. Exp (years)
8. LinkedIn (Found / Not found badge)
9. Confidence (High / Medium / Low badge)
10. Actions (icon buttons)

### Row checkbox
```css
.row-checkbox {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 0.5px solid var(--border-strong);
  background: var(--surface-2);
  display: inline-block;
  cursor: pointer;
}
.row-checkbox.checked {
  background: var(--fill-accent);
  border-color: var(--fill-accent);
}
```

### Row action buttons
```css
.row-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}
.icon-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 0.5px solid var(--border);
  background: var(--surface-2);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.1s;
}
.icon-btn:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}
```

---

## Badges

All badges use the same base shape. Never use plain text for status — always a badge.

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

/* Confidence */
.badge-high     { background: var(--badge-high-bg);    color: var(--badge-high-text); }
.badge-medium   { background: var(--badge-medium-bg);  color: var(--badge-medium-text); }
.badge-low      { background: var(--badge-low-bg);     color: var(--badge-low-text); }

/* LinkedIn / license presence */
.badge-found    { background: var(--badge-found-bg);   color: var(--badge-found-text); }
.badge-missing  { background: var(--badge-missing-bg); color: var(--badge-missing-text);
                  border: 0.5px solid var(--border); }
```

Confidence badge usage:
```jsx
const ConfidenceBadge = ({ score }) => (
  <span className={`badge badge-${score}`}>
    {score.charAt(0).toUpperCase() + score.slice(1)}
  </span>
)
// score: "high" | "medium" | "low"
```

LinkedIn badge usage:
```jsx
const LinkedInBadge = ({ found }) => (
  <span className={`badge ${found ? 'badge-found' : 'badge-missing'}`}>
    {found ? <><i className="ti ti-check" /> Found</> : 'Not found'}
  </span>
)
```

---

## Status Bar

```css
.status-bar {
  padding: 6px 16px;
  border-top: 0.5px solid var(--border);
  background: var(--surface-1);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
}
.status-bar-right {
  margin-left: auto;
}
```

Content: `● N candidates · N LinkedIn matches · Parsed with Gemini 1.5 Flash · Last updated just now`

---

## Icons

Use Tabler Icons (outline only). Add to `index.html`:

```html
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
```

Usage: `<i className="ti ti-{name}" aria-hidden="true" />`

Icons used in this design:
- `ti-file-search` — app logo
- `ti-layout-list` — candidates nav
- `ti-upload` — upload nav + button
- `ti-settings` — settings nav
- `ti-search` — search box
- `ti-download` — export button
- `ti-eye` — view detail action
- `ti-refresh` — re-run search action
- `ti-trash` — delete action
- `ti-check` — LinkedIn found badge
- `ti-chevron-down` — sortable column indicator
- `ti-loader-2` — upload progress spinner (animate with CSS rotation)

---

## Component File Map

| Component | File | Design sections above |
|---|---|---|
| App shell + layout | `App.jsx` | App Layout |
| Sidebar | `components/Sidebar.jsx` | Sidebar |
| Topbar | `components/Topbar.jsx` | Topbar, Buttons, Search |
| Upload progress | `components/SearchStatus.jsx` | Upload Progress Bar |
| Results table | `components/ResultsTable.jsx` | Results Table |
| Badges | `components/Badges.jsx` | Badges |
| Row actions | inside ResultsTable | Row action buttons |
| Status bar | `components/StatusBar.jsx` | Status Bar |
| Global styles | `styles/global.css` | Color Tokens, Typography |

---

## data-testid Attributes Required

Every interactive element needs a `data-testid` for E2E tests:

```
data-testid="nav-candidates"
data-testid="nav-upload"
data-testid="nav-settings"
data-testid="search-input"
data-testid="btn-export"
data-testid="btn-upload"
data-testid="upload-progress-bar"
data-testid="results-table"
data-testid="table-row-{id}"
data-testid="row-checkbox-{id}"
data-testid="row-action-view-{id}"
data-testid="row-action-search-{id}"
data-testid="row-action-delete-{id}"
data-testid="badge-confidence-{id}"
data-testid="badge-linkedin-{id}"
data-testid="status-bar"
```

---

## Empty State

When no candidates exist yet, replace the table with:

```jsx
<div style={{
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  color: 'var(--text-muted)'
}}>
  <i className="ti ti-file-search" style={{ fontSize: '40px' }} />
  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
    No candidates yet
  </p>
  <p style={{ fontSize: '12px' }}>
    Drop resume files above to get started
  </p>
</div>
```

---

## Implementation Notes for Cursor

1. Global CSS goes in `src/renderer/src/styles/global.css` — import it in `main.jsx`
2. Do not use Tailwind or any CSS framework — plain CSS only using the tokens above
3. Table sorting is client-side only — sort the candidates array in React state
4. Row selection uses a Set of IDs in React state — `selectedIds: Set<number>`
5. The upload progress bar is only rendered when `processingFiles.length > 0`
6. All click handlers on rows call `onSelectCandidate(id)` which opens the CandidateDetail drawer
7. Export button is disabled (visually muted) when no candidates exist
8. The sidebar filter chips update a `filters` object in React state — table re-renders filtered results
