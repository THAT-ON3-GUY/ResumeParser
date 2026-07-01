import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { _electron as electron } from '@playwright/test'

import { setupNetworkMocks } from './network-mocks.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = join(__dirname, '../../../..')
export const FIXTURES_DIR = join(PROJECT_ROOT, 'scripts/verify/fixtures')

const DEFAULT_STORE = {
  aiProvider: 'gemini',
  geminiApiKey: process.env.TEST_GEMINI_KEY || 'e2e-test-key',
  geminiModel: 'gemini-2.5-flash',
  claudeApiKey: '',
  googleSearchApiKey: '',
  googleCxId: '',
  linkedinConnected: false,
  searchDelaySeconds: 7,
  autoSearchOnUpload: true,
  defaultExportFormat: 'csv'
}

/** Create isolated userData and write electron-store config.json */
export function seedStore(overrides = {}) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'resume-intel-e2e-'))
  const config = { ...DEFAULT_STORE, ...overrides }
  writeFileSync(join(userDataDir, 'config.json'), JSON.stringify(config, null, 2))
  return userDataDir
}

export function getLaunchEnv(
  userDataDir,
  { e2e = true, ddgEmpty = false, linkedinFixture, geminiFixture, summaryFixture, publicTimeout } = {}
) {
  const env = {
    ...process.env,
    RESUME_INTEL_E2E_USER_DATA: userDataDir,
    RESUME_INTEL_E2E_FIXTURES: FIXTURES_DIR,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
  }
  delete env.GEMINI_API_KEY
  if (e2e) {
    env.RESUME_INTEL_E2E = '1'
  } else {
    delete env.RESUME_INTEL_E2E
  }
  if (ddgEmpty) {
    env.RESUME_INTEL_E2E_DDG_EMPTY = '1'
  } else {
    delete env.RESUME_INTEL_E2E_DDG_EMPTY
  }
  if (linkedinFixture) {
    env.RESUME_INTEL_E2E_LINKEDIN_FIXTURE = linkedinFixture
  } else {
    delete env.RESUME_INTEL_E2E_LINKEDIN_FIXTURE
  }
  delete env.RESUME_INTEL_E2E_LINKEDIN_ATTEMPT_FIXTURES
  if (geminiFixture) {
    env.RESUME_INTEL_E2E_GEMINI_FIXTURE = geminiFixture
  } else {
    delete env.RESUME_INTEL_E2E_GEMINI_FIXTURE
  }
  if (summaryFixture) {
    env.RESUME_INTEL_E2E_SUMMARY_FIXTURE = summaryFixture
  } else {
    delete env.RESUME_INTEL_E2E_SUMMARY_FIXTURE
  }
  if (publicTimeout) {
    env.RESUME_INTEL_E2E_PUBLIC_TIMEOUT = publicTimeout
  } else {
    delete env.RESUME_INTEL_E2E_PUBLIC_TIMEOUT
  }
  return env
}

export async function launchApp(userDataDir, options = {}) {
  const mainEntry = join(PROJECT_ROOT, 'out/main/index.js')
  if (!existsSync(mainEntry)) {
    throw new Error('Missing out/main/index.js — run npm run build first')
  }

  const app = await electron.launch({
    args: [mainEntry],
    cwd: PROJECT_ROOT,
    env: getLaunchEnv(userDataDir, options),
    timeout: 60000
  })

  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await setupNetworkMocks(page)
  return app
}

export async function relaunchApp(app, userDataDir, options = {}) {
  await app.close()
  return launchApp(userDataDir, options)
}

export function getDbPath(userDataDir) {
  return join(userDataDir, 'resume-intel.db')
}

/** Query candidates via renderer IPC (avoids better-sqlite3 Node ABI mismatch). */
export async function queryCandidates(page) {
  return page.evaluate(() => window.electron.getAllCandidates())
}

export async function getSettings(page) {
  return page.evaluate(() => window.electron.getSettings())
}

export function readExternalUrl(userDataDir) {
  const p = join(userDataDir, 'e2e-last-external-url.txt')
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8').trim()
}

export function clearExternalUrl(userDataDir) {
  const p = join(userDataDir, 'e2e-last-external-url.txt')
  if (existsSync(p)) rmSync(p)
}

export function readExportPath(userDataDir) {
  const p = join(userDataDir, 'e2e-last-export-path.txt')
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8').trim()
}

export async function uploadAndParse(page, fixturesDir = FIXTURES_DIR, fileName = 'sample-resume.pdf') {
  const filePath = join(fixturesDir, fileName)
  await page.getByTestId('upload-input').setInputFiles(filePath)
  await expectRowDone(page)
}

export async function expectRowDone(page) {
  const row = page.getByTestId('result-row').first()
  await row.waitFor({ state: 'visible', timeout: 30000 })
  const done = page.getByTestId('result-status').filter({ hasText: 'Done' }).first()
  const error = page.getByTestId('result-status').filter({ hasText: 'Error' }).first()
  await Promise.race([
    done.waitFor({ state: 'visible', timeout: 60000 }),
    error.waitFor({ state: 'visible', timeout: 60000 }).then(async () => {
      const msg = await error.textContent()
      throw new Error(`Parse failed in UI: ${msg}`)
    })
  ])
}

export async function acceptConfirmDialogs(page) {
  page.on('dialog', (dialog) => dialog.accept())
}

export async function withFreshApp(overrides, fn, options = {}) {
  const userDataDir = seedStore(overrides)
  const app = await launchApp(userDataDir, options)
  const page = await app.firstWindow()
  await page.waitForSelector('[data-testid="candidates-view"]')
  acceptConfirmDialogs(page)
  try {
    await fn({ app, page, userDataDir })
  } finally {
    await app.close()
    cleanupUserData(userDataDir)
  }
}

export function cleanupUserData(userDataDir) {
  if (process.env.RESUME_INTEL_E2E_KEEP === '1') return
  if (userDataDir && existsSync(userDataDir)) {
    rmSync(userDataDir, { recursive: true, force: true })
  }
}
