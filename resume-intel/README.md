# Resume Intel (Milestone 1)

Electron + React + Vite app: drag PDF/DOCX resumes, extract text, call **Google Gemini** (`gemini-2.5-flash` by default), show structured fields in a table.

## Prerequisites

- Node.js 20+ and npm
- A Gemini API key ([Google AI Studio](https://aistudio.google.com))

## Setup

```bash
cd resume-intel
npm install
```

## Run (development)

Create a **`.env`** file in the `resume-intel` folder (same level as `package.json`):

```env
GEMINI_API_KEY=your-key-here
```

`.env` is gitignored. On startup the main process loads it with **dotenv** before copying the key into `electron-store`.

Then:

```powershell
npm run dev
```

You can still set `GEMINI_API_KEY` in the shell if you prefer; real environment variables are not overwritten by dotenv’s defaults.

## Optional: model override

Default model is `gemini-2.5-flash`. To try another model, set before first Gemini call (e.g. temporary code) or extend store — `store` key `geminiModel` is read by the parser.

## Project layout

- `src/main/` — Electron main, IPC, parsing, Gemini
- `src/preload/` — `contextBridge` exposes **`window.electron`** (`webUtils.getPathForFile`, `readResume`, `parseResume`)
- `src/renderer/` — React UI

## Milestone 1 scope

- Scaffold + upload + PDF/DOCX text extraction + Gemini JSON extraction + results table  
- **Not included:** web search, LinkedIn, SQLite, export, Claude, Settings panel

## PDF parsing (pdf-parse v2)

This project uses **pdf-parse v2**, which uses a `PDFParse` class and a bundled worker. `src/main/parser/fileReader.js` imports `pdf-parse/worker` first (per upstream docs) to reduce “fake worker” / path issues in Electron. If PDF extraction still fails, see [pdf-parse troubleshooting](https://github.com/mehmet-kozan/pdf-parse/blob/HEAD/docs/troubleshooting.md) (worker path / `CanvasFactory`).
