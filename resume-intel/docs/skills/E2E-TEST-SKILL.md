---
name: resume-intel-e2e-test
description: Generates and runs headless Playwright Electron E2E tests for Resume Intel features from story Acceptance Criteria. Use after each AUTO-BUILD feature, when the user asks for E2E tests, test:e2e, or headless verification without manual UI clicking.
---

# Resume Intel E2E Test Skill

Generates permanent Playwright Electron specs from feature story **Acceptance Criteria** and runs them headlessly. Pair with [AUTO-BUILD-SKILL.md](../AUTO-BUILD-SKILL.md) Step 6.

## Prerequisites

Read before generating tests:

1. [docs/SKILL.md](../SKILL.md) — architecture, IPC, data model
2. Feature story under `docs/features/**/{id}-*.md`
3. [scripts/verify/e2e/helpers/README.md](../../scripts/verify/e2e/helpers/README.md) — launch, seed, DB helpers

## 1. Test runner setup

| Item | Value |
|------|--------|
| Runner | `@playwright/test` + Playwright `_electron` API |
| Spec location | `scripts/verify/e2e/{feature-id}-{feature-slug}.spec.js` |
| Full suite | `npm run test:e2e` |
| Single feature | `npm run test:e2e -- --grep "9.1"` |
| Build | `globalSetup` runs `npm run build` before any spec |

**Launch pattern** (always use helpers — never duplicate):

```javascript
import { test, expect } from '@playwright/test'
import { launchApp, relaunchApp, seedStore, getDbPath, queryCandidates } from './helpers/electron-app.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')
```

Each spec file:

1. `beforeAll` — create temp `userData`, `seedStore(userData)`, `launchApp(userData)`
2. `afterAll` — `app.close()`, remove temp dirs (keep if debugging with `RESUME_INTEL_E2E_KEEP=1`)
3. One `test.describe('9.1 — SQLite Persistence', () => { ... })` block
4. One `test('AC-1: ...', async () => { ... })` per acceptance criterion
5. Tests must not share mutable state; relaunch app when AC says "restart"

Environment variables (set by helpers automatically):

| Variable | Purpose |
|----------|---------|
| `RESUME_INTEL_E2E=1` | Enables fixture AI responses, external URL capture |
| `RESUME_INTEL_E2E_USER_DATA` | Isolated userData per test run |
| `RESUME_INTEL_E2E_FIXTURES` | Path to `scripts/verify/fixtures/` |

## 2. Test generation rules

When given a feature story, read **§4 Acceptance Criteria** and convert each `AC-N` line:

| Story language | Playwright action |
|----------------|-------------------|
| **Given** X | `beforeEach` setup, `seedStore`, DB insert, or fixture upload |
| **When** Y | User action: click, fill, setInputFiles, navigate |
| **Then** Z | `expect(...)` on DOM, DB helper, or captured IPC artifact |
| Restart app | `await relaunchApp(app, userDataDir)` — close + launch same userData |
| Click button | `page.getByTestId('...').click()` |
| Drag file / upload | `page.getByTestId('upload-input').setInputFiles(path)` |
| Open browser / external link | Assert `readExternalUrl(userData)` after click (no real browser) |
| Table has rows | `expect(page.getByTestId('result-row')).toHaveCount(n)` |
| DB has record | `queryCandidates(page)` via IPC — never assert DB via UI alone |
| API call | Never hit real Gemini/Claude — fixture via `RESUME_INTEL_E2E=1` |
| DDG scrape | When built: route intercept in main or fixture HTML via search module test hook |
| LinkedIn session | Pre-seed `linkedinConnected: true` in store before launch |

**Parsing AC text:** Strip Given/When/Then markers; keep the remainder as the test title suffix after `AC-N:`.

Example:

```
AC-1: Given a resume is parsed, when the app is closed and reopened, then the candidate record appears in the results table.
```

→

```javascript
test('AC-1: resume persists after app restart', async () => {
  await uploadAndParse(page, FIXTURES)
  await relaunchApp(app, userDataDir)
  page = await app.firstWindow()
  await expect(page.getByTestId('result-row')).toHaveCount(1)
  const rows = await queryCandidates(page)
  expect(rows.length).toBe(1)
})
```

## 3. Test ID convention

Every element E2E tests interact with **must** have `data-testid`. Add these when generating tests (do not rely on CSS classes).

### Global / App

| testid | Element |
|--------|---------|
| `nav-candidates` | Sidebar Candidates button |
| `nav-settings` | Sidebar Settings button |
| `candidates-view` | Main candidates content wrapper |
| `settings-view` | Settings panel root (or wrapper) |

### 1.1 Upload

| testid | Element |
|--------|---------|
| `upload-zone` | Upload drop zone section |
| `upload-input` | Hidden file input |
| `upload-rejection` | Unsupported file type message |
| `upload-warning` | Low text / scanned PDF warning |

### 6.1 / 9.1 Results

| testid | Element |
|--------|---------|
| `results-table` | Table wrapper |
| `result-row` | Each candidate row (multiple) |
| `result-status` | Status cell per row |
| `result-delete` | Delete button per row |
| `empty-table` | No candidates message |

### 8.1 Settings

| testid | Element |
|--------|---------|
| `settings-panel` | Panel root |
| `settings-gemini-key` | Gemini API key input |
| `settings-claude-key` | Claude API key input |
| `settings-ai-gemini` | Gemini provider radio |
| `settings-ai-claude` | Claude provider radio |
| `settings-gemini-status` | Gemini key status badge |
| `settings-link-gemini` | aistudio helper link button |
| `settings-link-claude` | anthropic helper link button |
| `settings-clear-all` | Clear all data button |
| `settings-back` | Back to candidates |

### 6.2 Detail

| testid | Element |
|--------|---------|
| `view-detail-btn` | View full detail button |
| `detail-drawer` | Drawer root |
| `detail-close` | Close drawer |

When adding a new feature, extend this table in the spec's header comment and add attributes to React components in the same PR.

## 4. Mock strategy

| Dependency | Mock approach |
|------------|---------------|
| Gemini / Claude | `RESUME_INTEL_E2E=1` → `geminiParser.js` reads `fixtures/gemini-response.json` (no network) |
| `shell.openExternal` | Main writes URL to `{userData}/e2e-last-external-url.txt`; test reads via helper |
| LinkedIn cookies | `seedStore(userData, { linkedinConnected: true, linkedinCookies: [] })` |
| DuckDuckGo HTML | Use `fixtures/ddg-results.html` in search module unit test; E2E uses `search:run` with `RESUME_INTEL_E2E` fixture hook when 3.1 ships |
| LinkedIn profile HTML | `fixtures/linkedin-profile.html` for 4.1 unit/E2E hooks |
| Resume files | Real temp paths: `fixtures/sample-resume.pdf`, `fixtures/sample-resume.docx` |

Never call live Gemini, Claude, DDG, or LinkedIn in E2E.

## 5. Fixture files

Maintain under `scripts/verify/fixtures/`:

```
fixtures/
├── sample-resume.pdf
├── sample-resume.docx
├── gemini-response.json
├── ddg-results.html
├── linkedin-profile.html
└── generate-fixtures.mjs   # regenerates binary fixtures
```

Regenerate after schema change:

```bash
node scripts/verify/fixtures/generate-fixtures.mjs
```

`gemini-response.json` must match fields in `src/main/parser/prompts.js` extraction schema.

## 6. After each feature build (AUTO-BUILD Step 6)

Replace manual-only checklist with:

1. Read this skill and the feature story AC section.
2. Add/update `data-testid` on components touched by the feature.
3. Create or update `scripts/verify/e2e/{id}-{slug}.spec.js` with one test per AC.
4. Run:

   ```bash
   npm run verify -- --feature <id>
   npm run test:e2e -- --grep "<id>"
   ```

5. Fix failures; re-run until both exit 0.
6. Output report:

```
E2E VERIFICATION — [Feature ID] [Feature Name]
==============================================
Static verify:  PASS (npm run verify)
E2E specs:      scripts/verify/e2e/[file].spec.js
E2E run:        PASS — npm run test:e2e -- --grep "[id]"

Tests:
[x] AC-1: ...
[x] AC-2: ...
```

Do not mark feature DONE in `docs/SKILL.md` until E2E grep passes.

## 7. Test storage and regression

- **Never delete** a spec file that once passed. Update when AC change.
- `npm run test:e2e` with no args runs **all** specs (full regression).
- New features add a new file; do not merge unrelated features into one file.
- Tag describe blocks with feature ID in the title for `--grep "3.1"`.

## 8. Spec file template

```javascript
/**
 * E2E tests — Feature {id} {Name}
 * Story: docs/features/{folder}/{file}.md
 * testids: [list testids used]
 */
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  launchApp,
  relaunchApp,
  seedStore,
  getDbPath,
  queryCandidates,
  readExternalUrl,
  clearExternalUrl
} from './helpers/electron-app.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, '../fixtures')
const FEATURE = '{id}'

let app
let page
let userDataDir

test.describe(`${FEATURE} — {Feature Name}`, () => {
  test.beforeAll(async () => {
    userDataDir = await seedStore({ geminiApiKey: 'e2e-test-key' })
    app = await launchApp(userDataDir)
    page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
  })

  test.afterAll(async () => {
    await app?.close()
  })

  test(`AC-1: {short description}`, async () => {
    // Given / When / Then
  })

  // AC-2, AC-3, ...
})
```

## 9. Helper API (use as-is)

See [scripts/verify/e2e/helpers/electron-app.mjs](../../scripts/verify/e2e/helpers/electron-app.mjs):

| Function | Purpose |
|----------|---------|
| `seedStore(overrides)` | Creates temp userData + writes electron-store config |
| `launchApp(userDataDir)` | Launches built Electron app headlessly |
| `relaunchApp(app, userDataDir)` | Close and relaunch preserving userData |
| `getDbPath(userDataDir)` | Path to `resume-intel.db` |
| `queryCandidates(page)` | Read candidates via renderer IPC (`window.electron.getAllCandidates()`) |
| `getSettings(page)` | Read settings via renderer IPC |
| `readExternalUrl(userDataDir)` | Last URL from mocked openExternal |
| `uploadAndParse(page, fixturesDir, fileName?)` | Upload fixture (default `sample-resume.pdf`) and wait for Done |
| `withFreshApp(overrides, fn, options?)` | Isolated launch/teardown per test |
| `acceptConfirmDialogs(page)` | Auto-accept `window.confirm` dialogs |

## 10. Common failures

| Symptom | Fix |
|---------|-----|
| `better_sqlite3.node` version mismatch in helpers | Query via `queryCandidates(page)` IPC, not Node SQLite |
| Store seed ignored / wrong API key in E2E | `store.js` uses `cwd: RESUME_INTEL_E2E_USER_DATA`; main sets `app.setPath('userData', …)` before DB init |
| Window never loads | Run `npm run build` first; check `out/main/index.js` exists |
| Upload no-op | Use `setInputFiles` on `upload-input`, not drag events |
| Parse timeout | Ensure `RESUME_INTEL_E2E=1` and fixture JSON valid |
| Grep matches wrong tests | Use feature ID in describe title: `'9.1 — ...'` |

## 11. Feature → spec file map

| ID | Spec file | Status |
|----|-----------|--------|
| 1.1 | `1.1-file-upload.spec.js` | Created |
| 2.1 | `2.1-gemini-extraction.spec.js` | Created |
| 8.1 | `8.1-settings-panel.spec.js` | Created |
| 9.1 | `9.1-sqlite-persistence.spec.js` | Created |
| 3.1 | `3.1-duckduckgo-search.spec.js` | Created |
| 4.2 | `4.2-linkedin-login-flow.spec.js` | Created |
