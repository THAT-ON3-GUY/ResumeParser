import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_TIMEOUT_MS = 12000
const TOTAL_BUDGET_MS = 15000

const HEALTHCARE_LICENSE_RE =
  /\b(MD|RN|NP|PA-C|PA\b|DO\b|DDS|PharmD|Nurse Practitioner|Registered Nurse|Physician Assistant|Doctor of Medicine)\b/i
const FINANCE_LICENSE_RE = /\b(Series 7|Series 63|Series 65|CFP|CFA|FINRA|BrokerCheck)\b/i
const SOFTWARE_SKILL_RE =
  /\b(Python|JavaScript|TypeScript|React|SQL|AWS|Node\.js|Go\b|Rust\b|Java\b|C\+\+|Docker|Kubernetes)\b/i
const LEGAL_FIELD_RE =
  /\b(law|legal|attorney|lawyer|paralegal|JD\b|Esquire|Esq\.|Litigation|Counsel)\b/i
const PE_LICENSE_RE = /\bPE\b|Professional Engineer|PE License/i

function listText(values) {
  return (values ?? []).map((v) => String(v)).join(' ')
}

function employerNames(extractedFields) {
  const names = []
  const current = extractedFields?.current_or_most_recent_employer?.company
  if (current) names.push(current)
  for (const job of extractedFields?.all_employers ?? []) {
    if (job?.company) names.push(job.company)
  }
  return [...new Set(names.filter(Boolean))]
}

/**
 * Decide which public APIs to query for a candidate.
 * @param {object} extractedFields
 */
export function selectPublicSources(extractedFields) {
  const licenses = listText(extractedFields?.licenses_certifications)
  const skills = listText(extractedFields?.skills)
  const employers = employerNames(extractedFields)
  const education = listText(extractedFields?.education?.map((e) => `${e.degree} ${e.field}`))
  const summary = extractedFields?.summary_title ?? ''

  const sources = []
  const notes = []

  if (HEALTHCARE_LICENSE_RE.test(licenses)) sources.push('npi')
  if (FINANCE_LICENSE_RE.test(licenses)) sources.push('finra')
  if (employers.length) sources.push('openCorporates')
  if (SOFTWARE_SKILL_RE.test(skills)) sources.push('github')
  if (LEGAL_FIELD_RE.test(`${licenses} ${education} ${summary}`)) sources.push('courtListener')

  if (PE_LICENSE_RE.test(licenses) && !HEALTHCARE_LICENSE_RE.test(licenses)) {
    notes.push('State engineering license board — verify PE license manually (not in NPI registry)')
  }

  return { sources: [...new Set(sources)], notes }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    })
  ])
}

function loadE2EFixture(name) {
  const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
  if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'))
}

function isE2ETimeoutSource(source) {
  const flag = process.env.RESUME_INTEL_E2E_PUBLIC_TIMEOUT ?? ''
  return flag.split(',').map((s) => s.trim()).includes(source)
}

async function queryNpi(extractedFields) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    if (isE2ETimeoutSource('npi')) throw new Error('npi timed out')
    return loadE2EFixture('public-npi.json')
  }
  const name = extractedFields?.summary_title?.split(' at ')?.[0] ?? ''
  const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&limit=5&first_name=${encodeURIComponent(name.split(' ')[0] ?? '')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NPI HTTP ${res.status}`)
  const data = await res.json()
  const found = Array.isArray(data.results) && data.results.length > 0
  return { found, data: found ? data.results.slice(0, 5) : null, status: 'ok' }
}

async function queryFinra(extractedFields) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    if (isE2ETimeoutSource('finra')) throw new Error('finra timed out')
    return loadE2EFixture('public-finra.json')
  }
  const name = extractedFields?.summary_title?.split(' at ')?.[0] ?? ''
  const url = `https://api.brokercheck.finra.org/search/individual?query=${encodeURIComponent(name)}&limit=5`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`FINRA HTTP ${res.status}`)
  const data = await res.json()
  const hits = data?.hits?.hits ?? []
  return { found: hits.length > 0, data: hits.length ? hits.slice(0, 5) : null, status: 'ok' }
}

async function queryOpenCorporates(extractedFields) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    if (isE2ETimeoutSource('openCorporates')) throw new Error('openCorporates timed out')
    return loadE2EFixture('public-opencorporates.json')
  }
  const employer = employerNames(extractedFields)[0]
  if (!employer) return { found: false, data: null, status: 'ok' }
  const url = `https://api.opencorporates.com/v0.4/officers/search?q=${encodeURIComponent(employer)}&per_page=5`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`OpenCorporates HTTP ${res.status}`)
  const data = await res.json()
  const officers = data?.results?.officers ?? []
  return { found: officers.length > 0, data: officers.length ? officers.slice(0, 5) : null, status: 'ok' }
}

async function queryGitHub(extractedFields) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    if (isE2ETimeoutSource('github')) throw new Error('github timed out')
    return loadE2EFixture('public-github.json')
  }
  const skills = (extractedFields?.skills ?? []).slice(0, 2).join(' ')
  const location = extractedFields?.location_hints?.[0] ?? ''
  const q = encodeURIComponent(`${skills} in:fullname ${location}`.trim())
  const url = `https://api.github.com/search/users?q=${q}&per_page=5`
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ResumeIntel/1.0' }
  })
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`)
  const data = await res.json()
  const profiles = data?.items ?? []
  return { found: profiles.length > 0, profiles: profiles.slice(0, 5), status: 'ok' }
}

async function queryCourtListener(extractedFields) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    if (isE2ETimeoutSource('courtListener')) throw new Error('courtListener timed out')
    return loadE2EFixture('public-courtlistener.json')
  }
  const name = extractedFields?.summary_title?.split(' at ')?.[0] ?? ''
  const url = `https://www.courtlistener.com/api/rest/v3/people/?name=${encodeURIComponent(name)}&page_size=5`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`CourtListener HTTP ${res.status}`)
  const data = await res.json()
  const people = data?.results ?? []
  return { found: people.length > 0, data: people.length ? people.slice(0, 5) : null, status: 'ok' }
}

const QUERY_FNS = {
  npi: queryNpi,
  finra: queryFinra,
  openCorporates: queryOpenCorporates,
  github: queryGitHub,
  courtListener: queryCourtListener
}

async function runSource(source, extractedFields) {
  const fn = QUERY_FNS[source]
  if (!fn) throw new Error(`Unknown public source: ${source}`)
  return withTimeout(fn(extractedFields), SOURCE_TIMEOUT_MS, source)
}

/**
 * @param {object} extractedFields
 * @returns {Promise<object>}
 */
export async function checkPublicSources(extractedFields) {
  const { sources, notes } = selectPublicSources(extractedFields)
  const started = Date.now()
  const results = {}

  if (!sources.length) {
    return {
      sourcesChecked: [],
      results,
      notes,
      checkedAt: new Date().toISOString()
    }
  }

  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      if (Date.now() - started > TOTAL_BUDGET_MS) {
        throw new Error(`${source} timed out`)
      }
      const data = await runSource(source, extractedFields)
      return { source, data }
    })
  )

  for (let i = 0; i < settled.length; i++) {
    const source = sources[i]
    const outcome = settled[i]
    if (outcome.status === 'fulfilled') {
      results[source] = outcome.value.data
    } else {
      const timedOut = /timed out/i.test(outcome.reason?.message ?? '')
      results[source] = {
        found: false,
        data: null,
        profiles: [],
        status: timedOut ? 'timed_out' : 'error',
        error: timedOut ? 'Timed out' : outcome.reason?.message ?? 'Failed'
      }
    }
  }

  return {
    sourcesChecked: sources,
    results,
    notes,
    checkedAt: new Date().toISOString()
  }
}

export function resetPublicSourcesForTests() {
  /* hook for tests if needed */
}
