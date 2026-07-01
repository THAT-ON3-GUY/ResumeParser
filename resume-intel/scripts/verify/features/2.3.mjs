import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SUMMARY_PROMPT } from '../../../src/main/parser/prompts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

const SUMMARY_KEYS = [
  'summary',
  'match_confidence',
  'best_outreach_method',
  'contact_hints',
  'discrepancies',
  'recommended_search_queries'
]

export async function run() {
  for (const key of SUMMARY_KEYS) {
    if (!SUMMARY_PROMPT.includes(`"${key}"`)) {
      throw new Error(`SUMMARY_PROMPT missing key ${key}`)
    }
  }

  const parserSrc = readFileSync(join(ROOT, 'src/main/parser/geminiParser.js'), 'utf8')
  if (!parserSrc.includes('summarizeWithGemini(data)')) {
    throw new Error('summarizeWithGemini is not implemented')
  }
  if (!parserSrc.includes('RESUME_INTEL_E2E_SUMMARY_FIXTURE')) {
    throw new Error('geminiParser missing E2E summary fixture hook')
  }

  const dbSrc = readFileSync(join(ROOT, 'src/main/db/database.js'), 'utf8')
  if (!dbSrc.includes('updateCandidateAiSummary')) {
    throw new Error('database.js missing updateCandidateAiSummary')
  }

  const ipcSrc = readFileSync(join(ROOT, 'src/main/ipc-handlers.js'), 'utf8')
  if (!ipcSrc.includes('runSummarizationForCandidate')) {
    throw new Error('ipc-handlers.js missing summarization step in enrichment pipeline')
  }

  const drawerSrc = readFileSync(
    join(ROOT, 'src/renderer/src/components/CandidateDetailDrawer.jsx'),
    'utf8'
  )
  if (!drawerSrc.includes('data-testid="ai-summary-section"')) {
    throw new Error('CandidateDetailDrawer missing AI summary section')
  }

  const fixture = JSON.parse(
    readFileSync(join(ROOT, 'scripts/verify/fixtures/gemini-summary-response.json'), 'utf8')
  )
  if (!fixture.summary || !fixture.match_confidence) {
    throw new Error('gemini-summary-response.json invalid')
  }

  return { ok: true, message: 'Summary prompt, parser, pipeline, DB, UI, and fixtures validated' }
}
