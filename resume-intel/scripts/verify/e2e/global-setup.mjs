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

  console.log('[e2e] Generating fixtures if needed...')
  spawnSync('node scripts/verify/fixtures/generate-fixtures.mjs', {
    cwd: root,
    shell: true,
    stdio: 'inherit'
  })
}
