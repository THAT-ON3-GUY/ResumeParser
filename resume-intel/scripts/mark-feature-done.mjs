#!/usr/bin/env node
/**
 * Mark a feature DONE in docs/FEATURE-PROGRESS.md and its story file.
 * Usage: npm run mark-done -- --feature 9.1
 *        npm run mark-done -- --feature 9.1 --status PARTIAL
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findStoryPath, ROOT } from './verify/common.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const FEATURE_NAMES = {
  '1.1': 'File Upload & Extraction',
  '2.1': 'Gemini Extraction',
  '2.2': 'Claude Fallback',
  '2.3': 'AI Summarization',
  '3.1': 'DuckDuckGo Search',
  '3.2': 'Google Search Fallback',
  '4.1': 'LinkedIn Scraping',
  '4.2': 'LinkedIn Login Flow',
  '5.1': 'Public Records APIs',
  '6.1': 'Results Table (full)',
  '6.2': 'Candidate Detail Drawer',
  '7.1': 'CSV & Excel Export',
  '8.1': 'Settings Panel',
  '9.1': 'SQLite Persistence',
  '10.1': 'Packaging & Installer'
}

/** Feature ID → milestone line substring in docs/SKILL.md */
const MILESTONE_BY_FEATURE = {
  '3.1': 'Milestone 2',
  '4.2': 'Milestone 3',
  '5.1': 'Milestone 4',
  '9.1': 'Milestone 5',
  '7.1': 'Milestone 6',
  '8.1': 'Milestone 7',
  '10.1': 'Milestone 8'
}

const args = process.argv.slice(2)
const featureIdx = args.indexOf('--feature')
const statusIdx = args.indexOf('--status')
const verifyFlag = args.includes('--verify')
const featureId = featureIdx >= 0 ? args[featureIdx + 1] : null
const status = statusIdx >= 0 ? args[statusIdx + 1]?.toUpperCase() : 'DONE'

if (!featureId || !FEATURE_NAMES[featureId]) {
  console.error('Usage: npm run mark-done -- --feature <id> [--status DONE|PARTIAL|MISSING] [--verify]')
  process.exit(1)
}

if (!['DONE', 'PARTIAL', 'MISSING'].includes(status)) {
  console.error('Status must be DONE, PARTIAL, or MISSING')
  process.exit(1)
}

if (verifyFlag && status === 'DONE') {
  console.log(`[mark-done] Running npm run verify -- --feature ${featureId}`)
  const result = spawnSync(`npm run verify -- --feature ${featureId}`, {
    cwd: ROOT,
    shell: true,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    console.error('[mark-done] verify failed — not updating docs')
    process.exit(1)
  }
}

const progressPath = join(ROOT, 'docs/FEATURE-PROGRESS.md')
if (!existsSync(progressPath)) {
  console.error('Missing docs/FEATURE-PROGRESS.md')
  process.exit(1)
}

let progress = readFileSync(progressPath, 'utf8')
const rowRe = new RegExp(
  `(\\|\\s*${featureId.replace('.', '\\.')}\\s*\\|[^|]+\\|)\\s*(MISSING|PARTIAL|DONE)\\s*(\\|[^|]*\\|[^|]*\\|)`
)
if (!rowRe.test(progress)) {
  console.error(`Feature ${featureId} not found in FEATURE-PROGRESS.md`)
  process.exit(1)
}

const verifyCol = status === 'DONE' ? 'yes' : status === 'PARTIAL' ? 'partial' : '—'
const e2eCol = status === 'DONE' ? 'yes' : '—'
progress = progress.replace(rowRe, `$1 ${status} | ${verifyCol} | ${e2eCol} |`)
writeFileSync(progressPath, progress)
console.log(`[mark-done] Updated FEATURE-PROGRESS.md → ${featureId} = ${status}`)

const storyPath = findStoryPath(featureId)
if (storyPath && existsSync(storyPath)) {
  let story = readFileSync(storyPath, 'utf8')
  story = story.replace(
    /\|\s*\*\*Status \(today\)\*\*\s*\|\s*(MISSING|PARTIAL|DONE)[^|]*\|/,
    `| **Status (today)** | ${status} |`
  )
  writeFileSync(storyPath, story)
  console.log(`[mark-done] Updated story metadata → ${storyPath}`)
}

if (status === 'DONE') {
  const milestoneKey = MILESTONE_BY_FEATURE[featureId]
  if (milestoneKey) {
    const skillPath = join(ROOT, 'docs/SKILL.md')
    let skill = readFileSync(skillPath, 'utf8')
    const milestoneRe = new RegExp(`(- \\[ \\] \\*\\*${milestoneKey}\\*\\*)`)
    if (milestoneRe.test(skill)) {
      skill = skill.replace(milestoneRe, `- [x] **${milestoneKey}**`)
      writeFileSync(skillPath, skill)
      console.log(`[mark-done] Checked ${milestoneKey} in docs/SKILL.md`)
    }
  }
}

console.log(`\nFeature ${featureId} (${FEATURE_NAMES[featureId]}) marked ${status}.`)
