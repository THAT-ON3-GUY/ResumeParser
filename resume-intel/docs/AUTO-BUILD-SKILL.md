# AUTO-BUILD SKILL — Resume Intel

You are an autonomous build agent for the Resume Intel project. When
activated, you do not wait for instructions. You read the project state,
determine what needs to be built next, and start building immediately.

**Verification skill:** After every build (Step 5), read and follow
`.cursor/skills/resume-intel-auto-verify/SKILL.md` and run automated
tests before asking the user to manual-test.

---

## Step 1 — Orient (do this first, every time)

Read these files in order before touching any code:

1. `docs/SKILL.md` — full project context, tech stack, architecture rules
2. `docs/features/` — scan all story files to understand the full feature map
3. `.cursor/skills/resume-intel-auto-verify/SKILL.md` — automated verify workflow

If either of these is missing or unreadable, stop and tell the user:
"Cannot find docs/SKILL.md or docs/features/ — please confirm the docs
folder exists at the project root."

---

## Step 2 — Assess Current State

Check which milestones are complete by examining the actual codebase,
not just the SKILL.md milestone checklist (which may be out of date).

**Primary checklist:** read `docs/FEATURE-PROGRESS.md` first. Each row
shows `MISSING`, `PARTIAL`, or `DONE` plus verify/E2E columns.

To list current progress from the terminal:

```bash
cat docs/FEATURE-PROGRESS.md
```

For each feature story, determine its real status:

| Status | Signal |
|---|---|
| DONE | The files referenced in the story exist AND the feature works end-to-end |
| PARTIAL | Files exist but Acceptance Criteria are not all met |
| MISSING | Referenced files do not exist at all |

Check these specific files to assess state:

```
src/main/parser/fileReader.js          → 1.1 file upload
src/main/parser/geminiParser.js        → 2.1 gemini extraction
src/main/parser/claudeParser.js        → 2.2 claude fallback
src/main/parser/aiProvider.js          → 2.1 / 2.2 abstraction
src/main/parser/prompts.js             → 2.1 prompts
src/main/search/duckduckgo.js          → 3.1 DDG search
src/main/search/googleSearch.js        → 3.2 google fallback
src/main/search/linkedin.js            → 4.1 linkedin scraping
src/main/search/publicSources.js       → 5.1 public records
src/main/db/database.js                → 9.1 sqlite
src/main/export/exporter.js            → 7.1 export
src/renderer/src/components/UploadZone.jsx        → 1.1 UI
src/renderer/src/components/ResultsTable.jsx      → 6.1 UI
src/renderer/src/components/CandidateDetail.jsx   → 6.2 UI
src/renderer/src/components/SettingsPanel.jsx     → 8.1 UI
src/renderer/src/components/SearchStatus.jsx      → 6.1 UI
src/renderer/src/components/ExportBar.jsx         → 7.1 UI
```

Optional: confirm automated health for a shipped feature:

```bash
npm run verify -- --feature 9.1
```

---

## Step 3 — Pick the Next Feature

Use this priority order. Pick the first feature that is MISSING or PARTIAL:

1. `1.1` — File Upload & Extraction
2. `2.1` — Gemini Extraction
3. `9.1` — SQLite Database (unblocks UI persistence)
4. `8.1` — Settings Panel (unblocks LinkedIn + Claude)
5. `3.1` — DuckDuckGo Search
6. `4.2` — LinkedIn Login Flow
7. `4.1` — LinkedIn Scraping
8. `5.1` — Public Records APIs
9. `2.3` — AI Summarization
10. `6.1` — Results Table (full version)
11. `6.2` — Candidate Detail Drawer
12. `2.2` — Claude Fallback
13. `7.1` — CSV & Excel Export
14. `10.1` — Packaging & Installer

If all features are DONE, output:
"All features complete. Ready for packaging (10.1) or manual QA."

---

## Step 4 — Announce Before Building

Before writing any code, output exactly this format:

```
RESUME INTEL — AUTO BUILD
=========================
Scanned: [N] feature stories
Complete: [list feature IDs]
Partial:  [list feature IDs with one-line gap description]
Missing:  [list feature IDs]

Next target: [Feature ID] — [Feature Name]
Story file:  docs/features/[path]/[file].md

Plan:
- Create: [list of new files]
- Modify: [list of existing files]
- Skip:   [list of files that will not be touched]

Proceeding in 5 seconds unless you say STOP.
```

Wait 5 seconds (simulate with a pause in your response), then proceed.
If the user says STOP before you begin, halt and ask what to change.

---

## Step 5 — Build the Feature

Read the full story file for the chosen feature. Implement exactly the
Functional Requirements listed — nothing more, nothing less.

Rules while building:

- **Never break working code.** If a file already exists and works,
  modify it minimally. Do not rewrite files that are not in your plan.
- **Follow the architecture rules in SKILL.md exactly.** No exceptions.
  - All AI calls go through `aiProvider.js`
  - Renderer never reads files or makes API calls directly
  - All keys come from `electron-store`, never hardcoded
  - All IPC channels follow the `feature:action` naming convention
- **Match the data model exactly.** Field names in the story file are
  canonical. Do not invent new field names.
- **Add console.log at every major step** while building so errors are
  traceable. These can be removed at packaging time.
- **One file at a time.** Show each file completely before moving to
  the next. Do not summarize with "// rest of file unchanged" — show
  the whole file.

---

## Step 6 — Verify After Building (automated + E2E)

**Do this yourself — do not skip to asking the user.**

1. Read `.cursor/skills/resume-intel-auto-verify/SKILL.md` and [docs/skills/E2E-TEST-SKILL.md](skills/E2E-TEST-SKILL.md).
2. Run static verification from project root:

   ```bash
   npm run verify -- --feature <Feature ID>
   ```

3. If exit code is **1**, fix failures and re-run until exit code **0**.
4. Generate or update E2E coverage for the feature:
   - Add `data-testid` attributes listed in E2E-TEST-SKILL.md to touched React components.
   - Create or update `scripts/verify/e2e/{id}-{slug}.spec.js` with one test per AC.
5. Run headless E2E for the feature:

   ```bash
   npm run test:e2e -- --grep "<Feature ID>"
   ```

6. Fix failures; re-run both commands until both exit 0.
7. Output the verification report:

```
E2E VERIFICATION — [Feature ID] [Feature Name]
==============================================
Static verify:  PASS (npm run verify)
E2E specs:      scripts/verify/e2e/[file].spec.js
E2E run:        PASS — npm run test:e2e -- --grep "[id]"

Tests:
[x] AC-1: [description]
[x] AC-2: [description]
[x] AC-3: [description]
```

Do not mark feature DONE in `docs/SKILL.md` until static verify **and** E2E grep pass.

---

## Step 7 — Check Off Finished Features and Loop

When static verify **and** E2E grep both pass for the feature you just built:

### 7a — Mark the feature done (automated)

Run from project root:

```bash
npm run mark-done -- --feature <Feature ID> --verify
```

This updates three places:

| File | What changes |
|------|----------------|
| `docs/FEATURE-PROGRESS.md` | Row status → `DONE`, verify/E2E columns → `yes` |
| `docs/features/**/<id>-*.md` | Metadata `Status (today)` → `DONE` |
| `docs/SKILL.md` | Related milestone checkbox → `[x]` (when mapped) |

To mark **PARTIAL** without checking milestones (e.g. vertical slice shipped, ACs remain):

```bash
npm run mark-done -- --feature 1.1 --status PARTIAL
```

To revert (rare):

```bash
npm run mark-done -- --feature 3.1 --status MISSING
```

**Rules:**

- Only run `mark-done` with `--status DONE` after Step 6 passes (verify exit 0 **and** E2E grep exit 0).
- Do **not** hand-edit `FEATURE-PROGRESS.md` during auto-build — use the script so rows stay consistent.
- `--verify` re-runs `npm run verify` before writing; omit it if you just ran verify successfully.

### 7b — Output checkoff confirmation

```
CHECKOFF — [Feature ID] [Feature Name]
======================================
FEATURE-PROGRESS.md:  [x] <id> → DONE
Story metadata:       Status (today) → DONE
SKILL.md milestone:   [x] Milestone N (if applicable)

Next: re-run Step 2 using FEATURE-PROGRESS.md, pick next MISSING/PARTIAL feature, continue from Step 4.
```

### 7c — Loop

1. Run Step 2 again (read `docs/FEATURE-PROGRESS.md` + codebase)
2. Run Step 3 to pick the next feature
3. Continue from Step 4 without waiting for further instruction

Do **not** mark DONE if `npm run verify -- --feature <id>` or E2E grep exits 1.

This loop continues until all features in `FEATURE-PROGRESS.md` are `DONE`
or the user says STOP.

---

## Step 8 — Error Handling (formerly Step 7)

If at any point a build step produces an error the user pastes back:

1. Read the full error message carefully
2. Identify the root cause (do not guess — trace it)
3. State the root cause in one sentence
4. Fix only the code causing the error
5. Do not re-explain the feature or re-announce the plan
6. Output only the corrected file(s)
7. Re-run `npm run verify -- --feature <id>` and E2E grep; then `npm run mark-done -- --feature <id> --verify`

---

## How to Activate This Skill

The user will activate you with one of these phrases:
- "auto build"
- "resume build"
- "next feature"
- "keep building"
- "continue"

When you see any of these, begin at Step 1 immediately.
Do not ask clarifying questions. Just start.

To run verification only (no new code):
- "verify"
- "run tests"
- "verify feature 9.1"

Begin at Step 6 with the requested feature ID.
