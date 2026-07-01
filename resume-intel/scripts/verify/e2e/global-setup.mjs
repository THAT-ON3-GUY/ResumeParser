import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export default async function globalSetup() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  console.log('[e2e] Building app...')
  const result = spawnSync('npm run build', {
    cwd: root,
    shell: true,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    throw new Error('npm run build failed before E2E tests')
  }

  console.log('[e2e] Rebuilding native modules for Electron (better-sqlite3)...')
  const native = spawnSync('npx electron-rebuild -f -w better-sqlite3', {
    cwd: root,
    shell: true,
    stdio: 'inherit'
  })
  if (native.status !== 0) {
    throw new Error('electron-rebuild failed before E2E tests')
  }

  console.log('[e2e] Generating fixtures if needed...')
  spawnSync('node scripts/verify/fixtures/generate-fixtures.mjs', {
    cwd: root,
    shell: true,
    stdio: 'inherit'
  })

  console.log('[e2e] Ensuring Playwright Chromium is installed (main-process search parsing)...')
  const browsers = spawnSync('npx playwright install chromium', {
    cwd: root,
    shell: true,
    stdio: 'inherit'
  })
  if (browsers.status !== 0) {
    throw new Error('playwright install chromium failed before E2E tests')
  }
}
