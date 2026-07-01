import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildQuery, parseDdgHtml, searchDuckDuckGo, resetSearchDelayForTests, markSearchFinishedForTests } from '../../../src/main/search/duckduckgo.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, '../fixtures')

export async function run() {
  const fields = {
    current_or_most_recent_employer: { company: 'LBYD Federal' },
    education: [{ school: 'Auburn University', graduation_year: 2018 }]
  }

  const query = buildQuery(fields)
  if (!query.includes('LBYD Federal') || !query.includes('site:linkedin.com/in')) {
    throw new Error(`buildQuery missing expected tokens: ${query}`)
  }

  const fallback = buildQuery(fields, { linkedInOnly: false })
  if (fallback.includes('site:linkedin.com/in')) {
    throw new Error('buildQuery linkedInOnly:false should omit site filter')
  }

  const html = readFileSync(join(FIXTURES, 'ddg-results.html'), 'utf8')
  const parsed = await parseDdgHtml(html)
  if (!parsed.length) throw new Error('parseDdgHtml returned no results from fixture')
  if (!parsed.some((r) => r.isLinkedIn && /linkedin\.com\/in\//i.test(r.url))) {
    throw new Error('parseDdgHtml did not flag LinkedIn URL')
  }

  process.env.RESUME_INTEL_E2E = '1'
  process.env.RESUME_INTEL_E2E_FIXTURES = FIXTURES
  resetSearchDelayForTests()
  markSearchFinishedForTests()
  const delayStart = Date.now()
  const result = await searchDuckDuckGo(fields)
  const delayElapsed = Date.now() - delayStart
  delete process.env.RESUME_INTEL_E2E
  delete process.env.RESUME_INTEL_E2E_FIXTURES

  if (!result.results.length) throw new Error('searchDuckDuckGo fixture mode returned empty results')
  if (!result.results[0].isLinkedIn) throw new Error('searchDuckDuckGo missing isLinkedIn flag')
  if (delayElapsed < 2000) throw new Error(`batch delay too short: ${delayElapsed}ms`)

  process.env.RESUME_INTEL_E2E = '1'
  process.env.RESUME_INTEL_E2E_FIXTURES = FIXTURES
  process.env.RESUME_INTEL_E2E_DDG_EMPTY = '1'
  resetSearchDelayForTests()
  markSearchFinishedForTests()
  const empty = await searchDuckDuckGo(fields)
  delete process.env.RESUME_INTEL_E2E
  delete process.env.RESUME_INTEL_E2E_FIXTURES
  delete process.env.RESUME_INTEL_E2E_DDG_EMPTY

  if (empty.results.length !== 0) throw new Error('empty fixture should yield zero results')

  return {
    ok: true,
    message: 'buildQuery, parseDdgHtml, fixture search, empty results, and batch delay OK'
  }
}
