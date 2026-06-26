import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '../..')

/** @type {Record<string, { files: string[], ipc?: string[] }>} */
export const FEATURE_MAP = {
  '1.1': {
    files: ['src/main/parser/fileReader.js', 'src/renderer/src/components/UploadZone.jsx'],
    ipc: ['resume:read', 'resume:parse']
  },
  '2.1': {
    files: ['src/main/parser/geminiParser.js', 'src/main/parser/aiProvider.js', 'src/main/parser/prompts.js'],
    ipc: ['resume:parse']
  },
  '2.2': { files: ['src/main/parser/claudeParser.js'], ipc: [] },
  '2.3': { files: ['src/main/parser/prompts.js'], ipc: [] },
  '3.1': { files: ['src/main/search/duckduckgo.js', 'src/renderer/src/components/SearchStatus.jsx'], ipc: ['search:run'] },
  '4.1': {
    files: [
      'src/main/search/linkedin.js',
      'src/renderer/src/components/CandidateDetailDrawer.jsx',
      'src/main/db/database.js'
    ],
    ipc: ['search:run', 'resume:parse']
  },
  '4.2': {
    files: ['src/main/search/linkedin.js'],
    ipc: ['linkedin:login', 'linkedin:disconnect', 'linkedin:status']
  },
  '5.1': {
    files: ['src/main/search/publicSources.js', 'src/renderer/src/components/CandidateDetailDrawer.jsx'],
    ipc: ['resume:parse', 'search:run']
  },
  '6.1': { files: ['src/renderer/src/components/ResultsTable.jsx'], ipc: ['db:get-all'] },
  '6.2': { files: ['src/renderer/src/components/CandidateDetailDrawer.jsx'], ipc: [] },
  '7.1': { files: ['src/main/export/exporter.js'], ipc: ['export:csv', 'export:excel'] },
  '8.1': {
    files: ['src/main/settings.js', 'src/renderer/src/components/SettingsPanel.jsx'],
    ipc: ['settings:get', 'settings:set', 'shell:open-external', 'linkedin:disconnect']
  },
  '9.1': {
    files: ['src/main/db/database.js'],
    ipc: ['db:get-all', 'db:delete', 'db:clear-all']
  },
  '10.1': { files: ['package.json'], ipc: [] }
}

export function runBuild() {
  const result = spawnSync('npm run build', {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    stdio: 'pipe'
  })
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  }
}

export function checkRequiredFiles(featureId) {
  const spec = FEATURE_MAP[featureId]
  if (!spec) return { ok: false, missing: [`Unknown feature ${featureId}`] }

  const missing = spec.files.filter((rel) => !existsSync(join(ROOT, rel)))
  return { ok: missing.length === 0, missing }
}

export function checkIpcChannels(featureId) {
  const spec = FEATURE_MAP[featureId]
  if (!spec?.ipc?.length) return { ok: true, missing: [] }

  const handlerPath = join(ROOT, 'src/main/ipc-handlers.js')
  if (!existsSync(handlerPath)) {
    return { ok: false, missing: ['src/main/ipc-handlers.js'] }
  }

  const source = readFileSync(handlerPath, 'utf8')
  const missing = spec.ipc.filter((ch) => !source.includes(`'${ch}'`) && !source.includes(`"${ch}"`))
  return { ok: missing.length === 0, missing }
}

export function parseAcceptanceCriteria(storyPath) {
  if (!existsSync(storyPath)) return []
  const text = readFileSync(storyPath, 'utf8')
  const section = text.split('## 4. Acceptance Criteria')[1]?.split('##')[0] ?? ''
  const lines = section.split('\n').filter((l) => /\*\*AC-\d+\.\*\*/.test(l))
  return lines.map((l) =>
    l
      .trim()
      .replace(/^-\s*/, '')
      .replace(/\*\*AC-(\d+)\.\*\*\s*/, 'AC-$1: ')
      .replace(/\*Given\*|\*when\*|\*then\*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

export function findStoryPath(featureId) {
  const major = featureId.split('.')[0]
  const folders = {
    '1': '01-resume-ingestion',
    '2': '02-ai-parsing',
    '3': '03-candidate-search',
    '4': '04-linkedin-integration',
    '5': '05-public-records',
    '6': '06-results-ui',
    '7': '07-export',
    '8': '08-settings',
    '9': '09-local-database',
    '10': '10-packaging'
  }
  const folder = folders[major]
  if (!folder) return null

  const dir = join(ROOT, 'docs/features', folder)
  if (!existsSync(dir)) return null

  const files = readdirSync(dir).filter(
    (f) => f.startsWith(`${featureId}-`) || f.startsWith(`${featureId}.`)
  )
  return files.length ? join(dir, files[0]) : null
}
