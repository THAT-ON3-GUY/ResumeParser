---
name: resume-intel-auto-verify
description: Runs automated build, file, IPC, and feature-specific tests for Resume Intel after each AUTO-BUILD feature. Use when verifying a feature, after auto build Step 5, when the user says verify or run tests, or when validating acceptance criteria for feature IDs like 9.1 or 2.1.
---

# Resume Intel Auto-Verify

Automated verification for the Resume Intel Electron app. Pair with [docs/AUTO-BUILD-SKILL.md](../../docs/AUTO-BUILD-SKILL.md) Step 6.

## When to run

Run **immediately after** implementing a feature (AUTO-BUILD Step 5), **before** asking the user to manual-test.

Trigger phrases: `verify`, `run tests`, `check feature`, `validate 9.1`, after any AUTO-BUILD completion.

## Command

From project root (`resume-intel/`):

```bash
npm run verify -- --feature <id>
```

Examples:

```bash
npm run verify -- --feature 9.1
npm run verify -- --feature 2.1
```

Exit code `0` = all automated checks passed. Exit code `1` = fix failures before marking DONE.

## What it checks

| Step | Check |
|------|--------|
| 1 | `npm run build` succeeds |
| 2 | Required source files for the feature exist |
| 3 | Expected IPC channels appear in `src/main/ipc-handlers.js` |
| 4 | Feature-specific test in `scripts/verify/features/<id>.mjs` (if present) |

After automated checks, the script prints **manual acceptance criteria** parsed from the feature story under `docs/features/`. Those still require `npm run dev` and UI confirmation.

## Output format

Report results using this template:

```markdown
VERIFICATION — [Feature ID] [Feature Name]
==========================================
Automated:
[x] npm run build
[x] Required files
[x] IPC handlers
[x] Feature-specific tests (or N/A)

Manual (from story AC):
[ ] AC-1: ...
[ ] AC-2: ...

To test manually:
1. npm run dev
2. [action from story]
3. Expected: [result]
```

Mark automated lines `[x]` only when `npm run verify` exits 0 for that feature.

## Adding tests for a new feature

1. Add entry to `FEATURE_MAP` in [scripts/verify/common.mjs](../../scripts/verify/common.mjs) (`files`, optional `ipc`).
2. Create [scripts/verify/features/&lt;id&gt;.mjs](../../scripts/verify/features/) exporting `async function run()` returning `{ ok: true, message: '...' }`.
3. Prefer **pure Node tests** (JSON repair, query builders, static analysis of main-process modules). Do not `import` `better-sqlite3` or Electron main modules in verify scripts — native modules are built for Electron, not system Node.
4. Run `npm run verify -- --feature <id>` until exit 0.

## Failure handling

1. Read the failing step name and detail from script output.
2. Fix only the root cause — do not re-announce the full build plan.
3. Re-run `npm run verify -- --feature <id>` until exit 0.
4. Then ask the user to confirm manual AC only.

## Do not

- Skip verify after AUTO-BUILD Step 5.
- Mark a feature DONE in `docs/SKILL.md` when verify exits 1.
- Ask the user to manual-test before automated verify passes.

## Reference

- Feature registry and helpers: [scripts/verify/common.mjs](../../scripts/verify/common.mjs)
- AUTO-BUILD loop: [docs/AUTO-BUILD-SKILL.md](../../docs/AUTO-BUILD-SKILL.md)
