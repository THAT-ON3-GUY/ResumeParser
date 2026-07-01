import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const browsersDir = join(root, 'resources/browsers')

console.log('[stage-browsers] installing Chromium into', browsersDir)

if (existsSync(browsersDir)) {
  rmSync(browsersDir, { recursive: true, force: true })
}
mkdirSync(browsersDir, { recursive: true })

execSync('npx playwright install chromium', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersDir }
})

console.log('[stage-browsers] done')
