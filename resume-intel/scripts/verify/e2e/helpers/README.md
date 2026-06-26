# E2E helpers

Import from `./helpers/electron-app.mjs` in every spec under `scripts/verify/e2e/`.

- `seedStore(overrides)` — temp userData + electron-store `config.json`
- `launchApp(userDataDir, { e2e: true })` — headless Electron via Playwright
- `relaunchApp(app, userDataDir)` — close and reopen (persistence tests)
- `queryCandidates(page)` — candidate records via renderer IPC
- `getSettings(page)` — settings via renderer IPC
- `readExternalUrl(userDataDir)` — captured `shell.openExternal` URL
- `uploadAndParse(page, fixturesDir, fileName?)` — upload fixture and wait for Done
- `withFreshApp(overrides, fn, options?)` — isolated launch/teardown per test

Requires `npm run build` before tests (handled by `playwright.config.js` globalSetup).

E2E env vars set automatically: `RESUME_INTEL_E2E`, `RESUME_INTEL_E2E_USER_DATA`, `RESUME_INTEL_E2E_FIXTURES`.
