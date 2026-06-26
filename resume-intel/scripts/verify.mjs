#!/usr/bin/env node
/**
 * Resume Intel automated feature verification.
 * Usage: node scripts/verify.mjs --feature 9.1
 *        npm run verify -- --feature 9.1
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  runBuild,
  checkRequiredFiles,
  checkIpcChannels,
  parseAcceptanceCriteria,
  findStoryPath,
  ROOT
} from './verify/common.mjs'

const args = process.argv.slice(2)
const featureIdx = args.indexOf('--feature')
const featureId = featureIdx >= 0 ? args[featureIdx + 1] : null

if (!featureId) {
  console.error('Usage: npm run verify -- --feature <id>   e.g. --feature 9.1')
  process.exit(1)
}

/** @type {{ name: string, ok: boolean, detail?: string }[]} */
const results = []

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log(`\nRESUME INTEL VERIFY — Feature ${featureId}`)
console.log('='.repeat(40))

console.log('\n[1/4] Production build')
const build = runBuild()
record('npm run build', build.ok, build.ok ? '' : (build.stderr || build.stdout).split('\n').slice(-3).join(' '))

console.log('\n[2/4] Required files')
const files = checkRequiredFiles(featureId)
record('Required files exist', files.ok, files.missing.join(', '))

console.log('\n[3/4] IPC channels')
const ipc = checkIpcChannels(featureId)
record('IPC handlers registered', ipc.ok, ipc.missing.join(', '))

console.log('\n[4/4] Feature-specific tests')
const featureTestPath = join(ROOT, 'scripts/verify/features', `${featureId}.mjs`)
if (existsSync(featureTestPath)) {
  try {
    const mod = await import(`./verify/features/${featureId}.mjs`)
    const out = await mod.run()
    record(`Feature test ${featureId}`, out.ok, out.message)
  } catch (err) {
    record(`Feature test ${featureId}`, false, err.message)
  }
} else {
  record(`Feature test ${featureId}`, true, 'No automated test module (static checks only)')
}

const storyPath = findStoryPath(featureId)
const ac = storyPath ? parseAcceptanceCriteria(storyPath) : []

const failed = results.filter((r) => !r.ok)
console.log('\n' + '='.repeat(40))
console.log(failed.length ? `RESULT: ${failed.length} check(s) FAILED` : 'RESULT: All automated checks PASSED')

if (ac.length) {
  console.log('\nManual acceptance criteria (story file):')
  for (const line of ac) {
    console.log(`  [ ] ${line}`)
  }
  console.log('\nRun npm run dev and confirm manual AC before marking feature DONE.')
}

process.exit(failed.length ? 1 : 0)
