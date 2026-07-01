# Resume Intel — AI Coding Skill

## Project Identity

**Name:** Resume Intel  
**Type:** Electron desktop application  
**Purpose:** A recruiter tool that parses scrubbed resumes, extracts candidate signals, searches public sources to identify the candidate, and surfaces outreach options — all locally, with no login required.  
**Primary user:** A non-technical recruiter who receives scrubbed (anonymized) resumes and needs to identify and contact the candidate themselves.

---

## Tech Stack (Authoritative)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Desktop shell | Electron | v28+ | Cross-platform, Mac + Windows |
| Build tool | electron-vite | latest | Handles ESM/CJS split for Electron |
| UI framework | React | v18 | Renderer process only |
| Primary AI | Google Gemini API | gemini-1.5-flash | Free tier, 1,500 req/day |
| Fallback AI | Anthropic Claude API | claude-sonnet-4-20250514 | Paid, higher accuracy |
| PDF extraction | pdf-parse | latest | Main process only |
| DOCX extraction | mammoth | latest | Main process only |
| Browser automation | Playwright | latest | Chromium for scraping |
| Excel export | xlsx | latest | CSV + Excel output |
| Settings persistence | electron-store | latest | Key-value, survives restarts |
| Local database | better-sqlite3 | latest | SQLite, single file, local only |

**No external SDKs for AI** — both Gemini and Claude are called via raw `fetch()`.

---

## Project File Structure

```
resume-intel/
├── docs/
│   ├── SKILL.md                    ← you are here
│   └── features/
│       ├── 01-resume-ingestion/
│       ├── 02-ai-parsing/
│       ├── 03-candidate-search/
│       ├── 04-linkedin-integration/
│       ├── 05-public-records/
│       ├── 06-results-ui/
│       ├── 07-export/
│       ├── 08-settings/
│       ├── 09-local-database/
│       └── 10-packaging/
├── electron.vite.config.js
├── package.json
└── src/
    ├── main/
    │   ├── index.js
    │   ├── ipc-handlers.js
    │   ├── parser/
    │   │   ├── aiProvider.js       ← ALL AI calls go through here
    │   │   ├── geminiParser.js
    │   │   ├── claudeParser.js
    │   │   ├── fileReader.js
    │   │   └── prompts.js
    │   ├── search/
    │   │   ├── duckduckgo.js
    │   │   ├── googleSearch.js
    │   │   ├── linkedin.js
    │   │   └── publicSources.js
    │   ├── export/
    │   │   └── exporter.js
    │   └── db/
    │       └── database.js
    └── renderer/
        └── src/
            ├── App.jsx
            ├── main.jsx
            └── components/
                ├── UploadZone.jsx
                ├── ResultsTable.jsx
                ├── CandidateDetail.jsx
                ├── LinkedInLogin.jsx
                ├── SettingsPanel.jsx
                ├── SearchStatus.jsx
                └── ExportBar.jsx
```

---

## Architecture Rules (Never Violate These)

1. **AI abstraction is mandatory.** Never call Gemini or Claude directly from any file except `geminiParser.js` and `claudeParser.js`. All other code calls `aiProvider.js` only.
2. **Main process handles all file I/O and network.** The renderer (React) never reads files or makes API calls directly — it sends IPC messages to the main process.
3. **Preload bridge is required.** The renderer accesses Electron APIs only through the contextBridge defined in `preload/index.js`. Never use `nodeIntegration: true`.
4. **No API keys in code.** All keys are stored in `electron-store` and loaded at runtime. Never hardcode a key.
5. **Anti-hallucination is non-negotiable.** AI prompts must instruct the model to return `null` for missing fields, never infer or guess. Every extracted fact must have a `source_quote`.
6. **SQLite is the single source of truth.** All parsed results are persisted to the local database immediately after extraction. The UI reads from the database, not in-memory state.

---

## AI Prompt Rules

When writing or modifying AI prompts in `prompts.js`:

- Always instruct the model to return **raw JSON only** — no markdown, no code fences, no preamble
- Always set `temperature: 0.1` for Gemini calls
- Always set `maxOutputTokens: 4000` minimum (resumes can be long)
- Always include: *"If a field is not present, return null or empty array. Never infer or guess."*
- Always strip backtick code fences from the response before parsing: `.replace(/```json|```/g, '').trim()`
- Always wrap `JSON.parse()` in a try/catch and surface a meaningful error

---

## IPC Channel Naming Convention

All IPC channels follow the pattern `feature:action`:

| Channel | Direction | Description |
|---|---|---|
| `resume:parse` | renderer → main | Parse a single resume file |
| `resume:parse-batch` | renderer → main | Parse multiple files |
| `search:run` | renderer → main | Run full search pipeline for a candidate |
| `linkedin:login` | renderer → main | Open LinkedIn login window |
| `linkedin:status` | main → renderer | Push connection status update |
| `export:csv` | renderer → main | Export results to CSV |
| `export:excel` | renderer → main | Export results to Excel |
| `settings:get` | renderer → main | Read all settings |
| `settings:set` | renderer → main | Write a setting |
| `db:get-all` | renderer → main | Fetch all candidates from DB |
| `db:delete` | renderer → main | Delete a candidate record |

---

## How to Read a Feature Story

Every file under `docs/features/` is a self-contained implementation plan. Before writing any code for a feature:

1. Read the story file for that feature
2. Check its `Depends on` field — confirm dependencies are shipped
3. Implement only what is listed in **Functional Requirements**
4. Verify against **Acceptance Criteria** before marking done
5. Follow the **Data Model** and **API Surface** exactly — do not invent new field names

---

## Smarter Model Configuration

For planning, story generation, and architecture decisions use:
- **Model:** `claude-opus-4-6` or `claude-sonnet-4-6` via claude.ai
- **For code generation in Cursor:** Use Cursor's default model (Claude Sonnet)
- **For quick iteration:** Gemini 1.5 Flash via aistudio.google.com

When asking an AI to implement a story:
1. Paste the full story `.md` file contents into the prompt
2. Include this `SKILL.md` as context
3. Ask it to implement only the FRs listed, nothing more
4. Ask it to output only the files that change

---

## Completed Milestones

- [x] **Milestone 1** — Electron shell + React UI + PDF/DOCX extraction + Gemini parsing + results table
- [x] **Milestone 2** — DuckDuckGo search
- [x] **Milestone 3** — LinkedIn authenticated scraping
- [x] **Milestone 4** — Public records APIs
- [x] **Milestone 5** — SQLite persistence
- [x] **Milestone 6** — Export (CSV + Excel)
- [x] **Milestone 7** — Settings panel
- [x] **Milestone 8** — Packaging + installer
