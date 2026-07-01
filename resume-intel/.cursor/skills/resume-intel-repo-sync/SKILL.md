---
name: resume-intel-repo-sync
description: Syncs the Resume Intel repo with origin on first spin-up or after idle time, pulls updates, resolves merge conflicts when safe, and asks the user before discarding local work or choosing between conflicting versions. Use when auto-build starts, when the user says sync repo, pull latest, fresh start, or when local and remote may have diverged.
---

# Resume Intel — Repository Sync

Run **before** reading docs or writing code when AUTO-BUILD activates, or when the user asks to sync/pull/update the repo.

Pair with [docs/AUTO-BUILD-SKILL.md](../../docs/AUTO-BUILD-SKILL.md) Step 0.

## When to run

Always run at the start of AUTO-BUILD (Step 0).

Also run when:
- User mentions stale repo, wrong version, or "pull latest"
- `git status` shows behind/ahead of remote
- Local changes exist and user wants to continue auto-build
- Last session was days/weeks ago (assume remote may have moved)

## Project root

All commands run from the **git repo root** (parent of `resume-intel/` if the monorepo root is `ResumeParser`, otherwise `resume-intel/`). Detect root with:

```bash
git rev-parse --show-toplevel
```

Use that directory as `cwd` for every git and npm command below.

---

## Step 1 — Inspect (always, parallel)

Run these in parallel:

```bash
git status
git branch -vv
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

After fetch, check divergence:

```bash
git rev-list --left-right --count HEAD...origin/main
```

Interpretation:

| Situation | Meaning |
|-----------|---------|
| `0  N` (ahead 0, behind N) | Safe fast-forward pull likely |
| `M  0` (ahead M, behind 0) | Unpushed local commits — ask before reset |
| `M  N` (both) | Diverged — merge or rebase needed |
| `0  0` | Up to date |

Record: branch name, clean/dirty working tree, ahead/behind counts, untracked files.

---

## Step 2 — Classify local changes

| Class | Examples | Default action |
|-------|----------|----------------|
| **Build artifacts** | `node_modules/`, `out/`, `dist/`, `test-results/`, `.last-run.json` | Ignore; never commit |
| **Agent session edits** | uncommitted changes under `resume-intel/src/`, `docs/`, `scripts/` | Ask user unless they said "discard my changes" |
| **Untracked agent files** | new scripts the agent created | Ask: keep, delete, or commit separately |
| **User WIP** | anything user was editing | **Never** discard without explicit approval |

If working tree is **clean** and only behind remote → proceed to Step 4 (pull).

If working tree is **dirty** → go to Step 3.

---

## Step 3 — Dirty tree: ask before destructive action

Output this summary, then **stop and ask** unless the user already said to discard local changes:

```
REPO SYNC — Local changes detected
==================================
Branch:     [name] ([ahead] ahead, [behind] behind origin/main)
Modified:   [count] files — [short list]
Untracked:  [count] files — [short list]
Remote:     [N] new commits on origin/main since last pull

Options:
A) Stash local changes, pull, re-apply stash (may conflict)
B) Discard all local changes, pull latest (DESTRUCTIVE)
C) Commit local changes first, then pull/merge
D) Stop — I will handle git manually
```

**Rules:**
- Never `git reset --hard`, `git clean -fd`, or `git push --force` without explicit user choice **B** or a direct user command.
- Never amend or force-push unless user rules allow and user asked.
- Never update git config.

If user chose **B** (discard): `git restore .` then remove only untracked files the user approved (or `git clean -fd` after confirmation).

If user chose **A** (stash):

```bash
git stash push -u -m "resume-intel auto-sync stash"
git pull origin main
git stash pop
```

If stash pop conflicts → Step 5.

If user chose **C** (commit first): follow user commit rules; then pull.

---

## Step 4 — Pull when clean or after stash

```bash
git pull origin main
```

Preferred: fast-forward. If pull reports "Already up to date", skip to Step 6.

If pull fails with merge conflict → Step 5.

If pull requires unrelated histories or rebase was configured → ask user; do not rebase -i.

---

## Step 5 — Resolve merge conflicts

1. List conflicted files:

   ```bash
   git diff --name-only --diff-filter=U
   ```

2. For each file, read conflict markers and summarize **both sides** in plain language:

```
CONFLICT — [path]
==============
Ours (local):   [one-line summary]
Theirs (remote): [one-line summary]
Recommendation: [keep ours | keep theirs | manual blend] because [reason]
```

3. **Auto-resolve only** when the choice is unambiguous:
   - `package-lock.json` → prefer remote after pull, then re-run `npm install`
   - `docs/FEATURE-PROGRESS.md`, story metadata → prefer **remote** (canonical progress from team/auto-build)
   - Generated fixtures under `scripts/verify/fixtures/` → prefer **remote**, regenerate if needed
   - `test-results/` → delete conflicted copies, regenerate via tests

4. **Ask the user** when both sides contain intentional source edits (`src/`, `docs/features/*.md` FR changes, IPC handlers). Present side-by-side summary and options:
   - Keep remote (theirs)
   - Keep local (ours)
   - Show me the full conflict (read file and quote regions)

5. After resolving each file: `git add <path>`. When all resolved:

   ```bash
   git status
   ```

   If merge in progress: complete with merge commit only if user asked to commit; otherwise leave staged and report — **AUTO-BUILD must not create merge commits unless user requested**.

   For auto-build after user-approved sync: completing the merge is OK if user chose sync path that includes pull with local commits.

6. If conflicts are too entangled → stop, list files, ask user to resolve or say "take all remote".

---

## Step 6 — Refresh dependencies

After a successful pull (or when `package.json` / lockfile changed):

```bash
cd resume-intel
npm install
```

On Windows, if E2E later fails with "Electron failed to install correctly":

```bash
node node_modules/electron/install.js
```

Verify the binary exists (`node_modules/electron/dist/electron.exe` on Windows).
If install.js exits without extracting, re-run `npm install electron` or ask the user.

Do not proceed to AUTO-BUILD Step 1 until `npm run build` succeeds once after sync.

---

## Step 7 — Report and continue

Output:

```
REPO SYNC — Complete
====================
Branch:     main @ [short sha]
Status:     [up to date | pulled N commits | merge completed | stash applied]
Local changes: [none | N files restored from stash | user WIP preserved]
Next:       AUTO-BUILD Step 1 — Orient
```

If sync failed or needs user input, **do not** start building. Wait for user decision.

---

## Abort conditions (stop and ask)

- Not a git repository
- No `origin` remote
- Detached HEAD
- Pull would overwrite untracked files (git error) — list files, ask to move/delete/stash
- Authentication failure — user must fix credentials
- User has unpushed commits they may want to keep — never reset without approval

---

## Quick commands reference

| Goal | Command |
|------|---------|
| Fetch only | `git fetch origin` |
| Behind check | `git rev-list --left-right --count HEAD...origin/main` |
| Safe discard tracked | `git restore .` |
| Stash including untracked | `git stash push -u -m "..."` |
| Pull main | `git pull origin main` |
| Conflicted files | `git diff --name-only --diff-filter=U` |

---

## Do not

- Skip sync because "we were up to date last session"
- Auto-build on a known-stale or conflicted tree
- Hand-edit conflict markers without reading both sides
- Commit sync fixes unless user asked for a commit
- Push to remote unless user explicitly asks
