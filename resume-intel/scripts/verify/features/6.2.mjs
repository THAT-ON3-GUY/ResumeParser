import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { selectPublicSources } from '../../../src/main/search/publicSources.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

const REQUIRED_SECTIONS = [
  'Summary title',
  'Current / most recent role',
  'Employment timeline',
  'Education',
  'Licenses & certifications',
  'Skills',
  'Search results',
  'LinkedIn profile',
  'Public records',
  'AI summary'
]

export async function run() {
  const drawerSrc = readFileSync(
    join(ROOT, 'src/renderer/src/components/CandidateDetailDrawer.jsx'),
    'utf8'
  )

  for (const title of REQUIRED_SECTIONS) {
    if (!drawerSrc.includes(title)) {
      throw new Error(`CandidateDetailDrawer missing section: ${title}`)
    }
  }

  if (!drawerSrc.includes('data-testid="detail-drawer"')) {
    throw new Error('CandidateDetailDrawer missing detail-drawer test id')
  }
  if (!drawerSrc.includes('data-testid="detail-close"')) {
    throw new Error('CandidateDetailDrawer missing close button test id')
  }
  if (!drawerSrc.includes('data-testid="detail-backdrop"')) {
    throw new Error('CandidateDetailDrawer missing backdrop close test id')
  }
  if (!drawerSrc.includes('data-testid="employer-timeline"')) {
    throw new Error('CandidateDetailDrawer missing employer timeline test id')
  }
  if (!drawerSrc.includes('SourceQuoteDetails')) {
    throw new Error('CandidateDetailDrawer missing collapsible source quotes')
  }
  if (!drawerSrc.includes('source-quote-')) {
    throw new Error('CandidateDetailDrawer missing source quote test ids')
  }
  if (!drawerSrc.includes("e.key === 'Escape'")) {
    throw new Error('CandidateDetailDrawer missing Escape key handler')
  }
  if (!drawerSrc.includes('data-testid="ai-summary-provider"')) {
    throw new Error('CandidateDetailDrawer missing AI provider badge')
  }

  const peFixture = JSON.parse(
    readFileSync(join(ROOT, 'scripts/verify/fixtures/gemini-response-pe.json'), 'utf8')
  )
  const { notes } = selectPublicSources(peFixture)
  if (!notes.join(' ').match(/engineering license board/i)) {
    throw new Error('selectPublicSources should note PE license board check')
  }

  return { ok: true, message: 'Drawer sections, source quotes, timeline, and enrichment UI validated' }
}
