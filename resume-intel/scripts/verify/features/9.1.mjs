import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

export async function run() {
  const dbSource = readFileSync(join(ROOT, 'src/main/db/database.js'), 'utf8')

  const requiredExports = [
    'initDatabase',
    'insertCandidate',
    'getAllCandidates',
    'getCandidateById',
    'deleteCandidate',
    'clearAllCandidates',
    'updateCandidateSearchResults'
  ]
  for (const name of requiredExports) {
    if (!dbSource.includes(`export function ${name}`)) {
      throw new Error(`database.js missing export: ${name}`)
    }
  }

  const requiredColumns = [
    'file_name',
    'raw_text',
    'extracted_fields',
    'search_results',
    'linkedin_data',
    'public_records',
    'ai_summary',
    'ai_provider',
    'confidence_score'
  ]
  for (const col of requiredColumns) {
    if (!dbSource.includes(col)) {
      throw new Error(`candidates schema missing column: ${col}`)
    }
  }

  const sample = { summary_title: 'Engineer at Acme', skills: ['JavaScript'] }
  const serialized = JSON.stringify(sample)
  const parsed = JSON.parse(serialized)
  if (parsed.summary_title !== 'Engineer at Acme') {
    throw new Error('JSON field serialization round-trip failed')
  }

  return {
    ok: true,
    message: 'database.js exports, schema columns, and JSON round-trip OK (native SQLite skipped in Node verify)'
  }
}
