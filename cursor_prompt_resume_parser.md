# Cursor Prompt: Resume Intelligence Desktop App

Paste everything below this line into Cursor's AI chat to plan and build the full application.

---

## Project Overview

Build a cross-platform **Electron desktop application** for a non-technical recruiter. The app accepts scrubbed resumes (PDFs and Word docs), extracts candidate signals using AI, then automatically searches free public sources to help identify and locate the candidate for outreach.

The primary AI provider is **Google Gemini 1.5 Flash** (free tier — 1,500 requests/day, no cost). **Anthropic Claude** is available as an optional upgrade the user can switch to in Settings for higher accuracy. All AI calls are abstracted behind a single `aiProvider` module so swapping is seamless.

The end user is non-technical. The app must require zero command-line interaction after install, and all workflows must be point-and-click.

---

## Tech Stack

- **Electron** (v28+) — cross-platform desktop shell
- **React** (v18) — UI layer via electron-vite scaffold
- **Node.js** — backend/main process logic
- **Google Gemini API** (`gemini-1.5-flash`) — primary AI provider, free tier (1,500 req/day)
- **Anthropic Claude API** (`claude-sonnet-4-20250514`) — optional fallback AI provider, higher accuracy
- **pdf-parse** — extract text from PDF resumes
- **mammoth** — extract text from .docx resumes
- **Playwright** (bundled Chromium) — authenticated LinkedIn scraping and DuckDuckGo search
- **xlsx** — export results to Excel/CSV
- **electron-store** — persist settings and LinkedIn session state
- **better-sqlite3** — local database for storing parsed results

---

## File Structure

Scaffold this exact structure before writing any feature code:

```
resume-intel/
├── electron.vite.config.js
├── package.json
├── src/
│   ├── main/
│   │   ├── index.js              # Electron main process entry
│   │   ├── ipc-handlers.js       # All IPC event handlers
│   │   ├── parser/
│   │   │   ├── fileReader.js     # PDF + DOCX text extraction
│   │   │   ├── aiProvider.js     # Abstraction layer — Gemini or Claude
│   │   │   ├── geminiParser.js   # Gemini API extraction logic (default)
│   │   │   ├── claudeParser.js   # Claude API extraction logic (fallback)
│   │   │   └── prompts.js        # Shared prompt templates
│   │   ├── search/
│   │   │   ├── duckduckgo.js     # DDG scraping via Playwright
│   │   │   ├── googleSearch.js   # Google Custom Search API (fallback)
│   │   │   ├── linkedin.js       # LinkedIn authenticated scraping
│   │   │   └── publicSources.js  # Free public APIs (licenses, courts, etc.)
│   │   ├── export/
│   │   │   └── exporter.js       # CSV and Excel export
│   │   └── db/
│   │       └── database.js       # SQLite schema and queries
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.jsx
│   │       ├── main.jsx
│   │       ├── components/
│   │       │   ├── UploadZone.jsx         # Drag and drop file upload
│   │       │   ├── ResultsTable.jsx       # Main results grid
│   │       │   ├── CandidateDetail.jsx    # Expanded candidate view
│   │       │   ├── LinkedInLogin.jsx      # LinkedIn auth window trigger
│   │       │   ├── SettingsPanel.jsx      # API keys and preferences
│   │       │   ├── SearchStatus.jsx       # Live progress indicator
│   │       │   └── ExportBar.jsx          # Export controls
│   │       └── styles/
│   │           └── global.css
└── resources/
    └── icon.png
```

---

## Feature Spec

### 1. Resume Upload & Parsing

- Drag-and-drop zone accepting `.pdf` and `.docx` files
- Support batch upload (up to 50 files at once)
- Show upload progress per file
- Extract raw text using `pdf-parse` (PDF) or `mammoth` (DOCX)
- Send extracted text to the AI provider using the extraction prompt below

---

### AI Provider Abstraction Layer

File: `src/main/parser/aiProvider.js`

All AI calls go through this single module. It reads the user's chosen provider from `electron-store` and routes accordingly. This means the rest of the app never calls Gemini or Claude directly — it always calls `aiProvider`.

```javascript
import { extractWithGemini, summarizeWithGemini } from './geminiParser.js'
import { extractWithClaude, summarizeWithClaude } from './claudeParser.js'
import store from '../store.js'

export const extractResume = async (resumeText) => {
  const provider = store.get('aiProvider', 'gemini') // default: gemini
  if (provider === 'claude') return extractWithClaude(resumeText)
  return extractWithGemini(resumeText)
}

export const summarizeFindings = async (data) => {
  const provider = store.get('aiProvider', 'gemini')
  if (provider === 'claude') return summarizeWithClaude(data)
  return summarizeWithGemini(data)
}
```

---

### Gemini Parser (Default — Free)

File: `src/main/parser/geminiParser.js`

```javascript
import { EXTRACTION_PROMPT, SUMMARY_PROMPT } from './prompts.js'
import store from '../store.js'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const callGemini = async (prompt) => {
  const apiKey = store.get('geminiApiKey')
  if (!apiKey) throw new Error('Gemini API key not set. Add it in Settings.')

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,      // low temp = more deterministic, less hallucination
        maxOutputTokens: 1500
      }
    })
  })

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  // Strip any markdown code fences Gemini might add
  return raw.replace(/```json|```/g, '').trim()
}

export const extractWithGemini = async (resumeText) => {
  const raw = await callGemini(EXTRACTION_PROMPT + resumeText)
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Gemini returned invalid JSON. Raw response: ' + raw.slice(0, 200))
  }
}

export const summarizeWithGemini = async (data) => {
  const raw = await callGemini(SUMMARY_PROMPT + JSON.stringify(data, null, 2))
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Gemini summary returned invalid JSON.')
  }
}
```

---

### Claude Parser (Optional Fallback)

File: `src/main/parser/claudeParser.js`

```javascript
import { EXTRACTION_PROMPT, SUMMARY_PROMPT } from './prompts.js'
import store from '../store.js'

const callClaude = async (prompt) => {
  const apiKey = store.get('claudeApiKey')
  if (!apiKey) throw new Error('Claude API key not set. Add it in Settings.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json()
  const raw = data.content?.[0]?.text || ''
  return raw.replace(/```json|```/g, '').trim()
}

export const extractWithClaude = async (resumeText) => {
  const raw = await callClaude(EXTRACTION_PROMPT + resumeText)
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Claude returned invalid JSON.')
  }
}

export const summarizeWithClaude = async (data) => {
  const raw = await callClaude(SUMMARY_PROMPT + JSON.stringify(data, null, 2))
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Claude summary returned invalid JSON.')
  }
}
```

---

**Shared Extraction Prompt (in `prompts.js` — used by both providers):**

```javascript
export const EXTRACTION_PROMPT = `
You are a resume parser for a recruiting team.

Extract the following fields from the resume text below and return ONLY a valid JSON object — no explanation, no markdown, no preamble, no code fences.

Fields to extract:
{
  "previous_employers": [{ "company": string, "title": string, "start_year": number|null, "end_year": number|null }],
  "education": [{ "school": string, "degree": string, "field": string, "graduation_year": number|null }],
  "licenses_certifications": [{ "name": string, "issuing_body": string|null, "year": number|null }],
  "skills": [string],
  "pronouns": string|null,
  "years_experience": number|null,
  "location_hints": [string],
  "associations_memberships": [string],
  "languages": [string]
}

STRICT RULES:
- Only extract information explicitly stated in the text
- Never infer, guess, or estimate any field
- If a field is not present, return null or empty array
- Do not attempt to identify the person by name
- Return raw JSON only — no markdown, no backticks, no explanation

Resume text:
`

export const SUMMARY_PROMPT = `
You are helping a recruiter understand a candidate based on resume data 
and public information found online.

Below is:
1. Structured data extracted from a scrubbed resume
2. Public information found from search results and LinkedIn

Your job:
- Summarize the candidate's background in 3-4 sentences
- Note any strong matches between resume data and online profiles  
- Flag any discrepancies between resume claims and public records
- Suggest the best way to reach out (LinkedIn, email if found, etc.)
- Assign a match_confidence score: high / medium / low

STRICT RULES:
- Only reference information present in the data provided below
- Never invent, infer, or speculate about the person
- If data is insufficient, say so explicitly
- Return raw JSON only — no markdown, no backticks, no explanation

Return ONLY a valid JSON object:
{
  "summary": string,
  "match_confidence": "high"|"medium"|"low",
  "best_outreach_method": string,
  "contact_hints": [string],
  "discrepancies": [string],
  "recommended_search_queries": [string]
}

Data:
`
```

---

### 2. Search Pipeline (runs automatically after parsing)

Run these steps in order for each parsed resume. Each step feeds into the next.

#### Step A — DuckDuckGo Search (Primary, Free, No Key)

File: `src/main/search/duckduckgo.js`

- Launch a hidden Playwright Chromium browser
- Build search query from extracted fields:
  ```javascript
  const buildQuery = (parsed) => {
    const parts = []
    if (parsed.previous_employers?.[0]?.company) 
      parts.push(`"${parsed.previous_employers[0].company}"`)
    if (parsed.education?.[0]?.school) 
      parts.push(`"${parsed.education[0].school}"`)
    if (parsed.education?.[0]?.graduation_year) 
      parts.push(`"${parsed.education[0].graduation_year}"`)
    if (parsed.licenses_certifications?.[0]?.name) 
      parts.push(`"${parsed.licenses_certifications[0].name}"`)
    parts.push('site:linkedin.com/in')
    return parts.join(' ')
  }
  ```
- Scrape `https://html.duckduckgo.com/html/?q={query}`
- Extract result titles, snippets, and URLs
- Add 2-3 second delay between searches to avoid rate limiting
- Return top 5 results

#### Step B — LinkedIn Profile Scrape (Free, Requires User Session)

File: `src/main/search/linkedin.js`

- If a LinkedIn session cookie exists (from prior login), use it
- Open a hidden BrowserWindow with the saved session
- Navigate to each LinkedIn URL found in Step A
- Extract:
  ```javascript
  const data = await win.webContents.executeJavaScript(`
    ({
      name: document.querySelector('h1')?.innerText?.trim(),
      headline: document.querySelector('.text-body-medium')?.innerText?.trim(),
      location: document.querySelector('.text-body-small.inline')?.innerText?.trim(),
      about: document.querySelector('#about ~ div .full-width')?.innerText?.trim(),
      experience: [...document.querySelectorAll('.experience-item')]
        .map(el => el.innerText?.trim()).slice(0, 5),
      education: [...document.querySelectorAll('.education__list-item')]
        .map(el => el.innerText?.trim()),
      contactInfo: document.querySelector('.pv-contact-info')?.innerText?.trim()
    })
  `)
  ```
- Add 5-10 second randomized delay between profile visits
- If no session exists, prompt user to connect LinkedIn (see Settings)

#### Step C — Google Custom Search (Fallback, 100/day Free)

File: `src/main/search/googleSearch.js`

- Only runs if DuckDuckGo returns no LinkedIn URL
- Requires user to enter Google Custom Search API key and CX ID in Settings
- Same query logic as Step A
- Returns top 5 results

#### Step D — Free Public Source Lookups

File: `src/main/search/publicSources.js`

Run these in parallel based on what was extracted:

```javascript
// Professional license lookup (state boards)
// Trigger if licenses_certifications is non-empty
const checkLicenses = async (name, state) => {
  // National Provider Index (healthcare)
  const npi = await fetch(
    `https://npiregistry.cms.hhs.gov/api/?search_type=NPI_1&first_name=${firstName}&last_name=${lastName}&version=2.1`
  )
  // FINRA BrokerCheck (finance)  
  const finra = await fetch(
    `https://api.brokercheck.finra.org/search/individual?query=${name}`
  )
  return { npi: await npi.json(), finra: await finra.json() }
}

// OpenCorporates — business filings
// Trigger if any employer or association found
const checkCorporate = async (name) => {
  return fetch(
    `https://api.opencorporates.com/v0.4/officers/search?q=${encodeURIComponent(name)}&per_page=5`
  )
}

// GitHub — tech candidates
// Trigger if "software", "engineer", "developer" in skills
const checkGitHub = async (name) => {
  return fetch(
    `https://api.github.com/search/users?q=${encodeURIComponent(name)}+type:user&per_page=3`,
    { headers: { 'Accept': 'application/vnd.github.v3+json' } }
  )
}

// CourtListener — public court records
const checkCourts = async (name) => {
  return fetch(
    `https://www.courtlistener.com/api/rest/v3/people/?name_last=${lastName}&name_first=${firstName}`
  )
}
```

---

### 3. AI Summarization (After All Searches Complete)

After all search steps complete, call `aiProvider.summarizeFindings(data)` passing the combined object of extracted resume fields + all search results. The shared `SUMMARY_PROMPT` in `prompts.js` handles both Gemini and Claude. See the AI Provider section above for implementation.

---

### 4. Results UI

#### Main Table View
Columns:
- File name
- Top employer match
- Education match
- Confidence score (color coded: green/yellow/red)
- LinkedIn found (✓/✗)
- Actions: View Detail, Search Again, Export Row

#### Candidate Detail Panel (slide-in drawer)
Sections:
- Extracted Resume Fields (structured)
- Search Findings (DDG snippets, LinkedIn data)
- Public Records (licenses, court, GitHub)
- AI Summary (labeled with which provider was used: Gemini / Claude)
- Outreach Suggestions
- Raw source quotes for every extracted field (collapsible)

#### Search Status
Live progress bar showing:
`Parsing... → Searching DDG... → Checking LinkedIn... → Checking Public Records... → Summarizing...`

---

### 5. LinkedIn Login Flow

In Settings panel:

```javascript
// Trigger a visible BrowserWindow for LinkedIn login
const openLinkedInLogin = () => {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    title: 'Sign in to LinkedIn'
  })
  win.loadURL('https://www.linkedin.com/login')
  
  // Detect successful login
  win.webContents.on('did-navigate', async (e, url) => {
    if (url.includes('linkedin.com/feed') || url.includes('linkedin.com/home')) {
      // Save session cookies via electron-store
      const cookies = await win.webContents.session.cookies.get({ domain: '.linkedin.com' })
      store.set('linkedinCookies', cookies)
      store.set('linkedinConnected', true)
      win.close()
      // Notify renderer: LinkedIn connected
      mainWindow.webContents.send('linkedin-connected')
    }
  })
}
```

Show connection status in Settings: 🟢 LinkedIn Connected / 🔴 Not Connected

---

### 6. Settings Panel

Fields:
- **AI Provider** — toggle: `Gemini (Free)` / `Claude (Paid, Higher Accuracy)`
- **Gemini API Key** (required for default) — get free at aistudio.google.com
- **Claude API Key** (optional, only if Claude selected) — stored in electron-store, never hardcoded
- **Google Custom Search API Key** (optional fallback for web search)
- **Google CX ID** (optional fallback)
- **LinkedIn Session** — Connect / Disconnect button
- **Search Delay** — slider 2-10 seconds between LinkedIn requests (default 7)
- **Auto-search on upload** — toggle on/off
- **Default export format** — CSV or Excel

Show a status row for each API key: 🟢 Connected / 🔴 Not Set

Include a helper link next to each key field:
- Gemini: "Get a free key at aistudio.google.com →"
- Claude: "Get a key at console.anthropic.com →"

---

### 7. Export

- Export all results or selected rows
- CSV: one row per candidate, one column per field
- Excel: formatted with headers, color-coded confidence column
- Include a "Sources" sheet in Excel listing all URLs found

---

### 8. Local Database

Use `better-sqlite3` to persist all results locally:

```sql
CREATE TABLE candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT,
  raw_text TEXT,
  extracted_fields JSON,
  search_results JSON,
  linkedin_data JSON,
  public_records JSON,
  ai_summary JSON,
  ai_provider TEXT,          -- "gemini" or "claude", logged per record
  confidence_score TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Results persist between app sessions. User can clear database from Settings.

---

## UI Design Direction

- Clean, professional HR tool aesthetic
- Dark sidebar, light main content area
- Monospace font for extracted data fields
- Color coding: green (high confidence), amber (medium), red (low / not found)
- No login screen — opens directly to upload view
- Responsive to window resize
- Native OS title bar

---

## Anti-Hallucination Requirements

These must be enforced throughout:

1. All AI prompts explicitly forbid inference — always `null` over a guess
2. `generationConfig.temperature: 0.1` set on Gemini calls to minimize creativity
3. Every extracted field stored with a `source_quote` pulled from the original resume text
4. Summary prompt only receives data already found — never asked to "fill in gaps"
5. Confidence scoring penalizes sparse data rather than filling it with assumptions
6. UI clearly shows which fields came from resume vs. which came from web search
7. Strip markdown code fences from all AI responses before JSON parsing — both Gemini and Claude sometimes wrap output in backticks despite instructions

---

## Build Instructions for Cursor

1. Scaffold the project using `electron-vite` with React template:
   ```
   npm create @quick-start/electron resume-intel -- --template react
   ```

2. Install all dependencies:
   ```
   npm install pdf-parse mammoth playwright xlsx better-sqlite3 electron-store
   npx playwright install chromium
   ```
   Note: No Anthropic or Google SDK needed — both APIs are called directly via fetch.

3. Build in this order:
   - [ ] Project scaffold and package.json
   - [ ] Database schema and electron-store setup
   - [ ] File reader (PDF + DOCX)
   - [ ] Shared prompts.js
   - [ ] Gemini parser (default)
   - [ ] Claude parser (fallback)
   - [ ] aiProvider abstraction layer
   - [ ] DuckDuckGo search module
   - [ ] LinkedIn scraper + login flow
   - [ ] Public source APIs
   - [ ] IPC handlers connecting main to renderer
   - [ ] React UI: Upload zone
   - [ ] React UI: Results table
   - [ ] React UI: Candidate detail drawer
   - [ ] React UI: Settings panel (with provider toggle)
   - [ ] Export module
   - [ ] End-to-end test with a sample resume

4. After scaffolding, show me `package.json` and `src/main/index.js` before proceeding to feature code.

---

## Notes

- All data stays local — nothing is sent anywhere except AI API calls and search queries
- **Gemini 1.5 Flash is the default and is completely free** (1,500 requests/day via aistudio.google.com)
- Claude is an optional upgrade for higher accuracy — costs ~$0.01-0.02 per resume
- Getting a Gemini API key: go to aistudio.google.com → Sign in → Get API Key → Create API key
- LinkedIn scraping uses the user's own session — they bear responsibility for their own ToS
- App should work fully offline except for AI API calls and live searches
- Target platforms: macOS and Windows
- The `aiProvider` abstraction means switching between Gemini and Claude requires zero code changes — just a settings toggle
