![CI](https://github.com/THAT-ON3-GUY/resume-intel/actions/workflows/ci.yml/badge.svg)
# Resume Intel

[![CI](https://github.com/THAT-ON3-GUY/ResumeParser/actions/workflows/ci.yml/badge.svg)](https://github.com/THAT-ON3-GUY/ResumeParser/actions/workflows/ci.yml)

Electron + React desktop app for recruiters: upload PDF/DOCX resumes, extract structured fields with **Google Gemini**, enrich candidates via DuckDuckGo, LinkedIn, and public records, and persist results in a local SQLite database.

## Prerequisites

- Node.js 20+ and npm
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)

## Setup

```bash
cd resume-intel
npm install
```

Create a `.env` file in `resume-intel/` (gitignored):

```env
GEMINI_API_KEY=your-key-here
```

On startup the main process loads `.env` with dotenv and copies the key into `electron-store`. You can also set `GEMINI_API_KEY` in your shell instead.

## Development

```bash
npm run dev
```

Drag PDF or DOCX files into the app, or use the upload controls in the sidebar/top bar.

## Tests

```bash
# Unit tests (Vitest). If you see a better-sqlite3 NODE_MODULE_VERSION error, run:
# npm rebuild better-sqlite3
npm run test

# End-to-end tests (Playwright + Electron, headless)
# Uses TEST_GEMINI_KEY and fixture mocks — no live API calls
# First run downloads Chromium via Playwright (used by main-process search parsing)
npm run test:e2e

# Lint
npm run lint
```

E2E tests seed `electron-store` with `TEST_GEMINI_KEY` (defaults to a placeholder when unset) and mock Gemini/DuckDuckGo via `RESUME_INTEL_E2E=1` plus Playwright network interception using fixtures in `scripts/verify/fixtures/`.

## Build

```bash
# Compile the app (required before E2E or packaging)
npm run build

# Platform installers (requires electron-builder)
npm run build:win   # Windows NSIS .exe
npm run build:mac   # macOS .dmg
```

Installers are written to `release/`. CI builds and publishes zipped installers on every push to `main`.

## Project layout

| Path | Purpose |
|------|---------|
| `src/main/` | Electron main process, IPC, parsing, search, SQLite |
| `src/preload/` | `contextBridge` → `window.electron` |
| `src/renderer/` | React UI |
| `docs/features/` | Feature story specs |
| `scripts/verify/` | Feature verification and E2E tests |
| `tests/unit/` | Vitest unit tests |

## Branch protection (recommended)

Configure these rules on the `main` branch in GitHub **Settings → Branches → Branch protection rules**:

1. **Require a pull request before merging** — enable required approvals (at least 1 reviewer).
2. **Require status checks to pass before merging** — select the CI job **Build, Lint, Unit & E2E Tests**.
3. **Do not allow bypassing the above settings** (including for admins, if your team policy requires it).
4. **Restrict who can push to matching branches** — block direct pushes to `main`; all changes should go through PRs.

## Gemini API key

1. Sign in to [Google AI Studio](https://aistudio.google.com).
2. Open **Get API key** and create a key for your Google Cloud project.
3. Paste the key into `.env` as `GEMINI_API_KEY` or enter it in the in-app Settings panel.

Default model is `gemini-2.5-flash` (configurable in Settings via `geminiModel` in the store).

## CI/CD

Every pull request and push to `main` runs build, lint, unit tests, and E2E tests on Ubuntu. Pushes to `main` also build Windows and macOS installers, upload artifacts, and create a GitHub Release tagged `v{version}` with release notes listing feature stories in `docs/features/`.
