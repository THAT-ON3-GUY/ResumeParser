import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, '../fixtures')
const ROOT = join(__dirname, '../../..')

export async function run() {
  if (!readFileSync(join(ROOT, 'src/main/search/publicSources.js'), 'utf8').includes('Promise.allSettled')) {
    throw new Error('publicSources.js must use Promise.allSettled for parallel queries')
  }

  process.env.RESUME_INTEL_E2E = '1'
  process.env.RESUME_INTEL_E2E_FIXTURES = FIXTURES

  const { selectPublicSources, checkPublicSources } = await import(
    '../../../src/main/search/publicSources.js'
  )

  const peSelection = selectPublicSources({
    licenses_certifications: ['PE License'],
    skills: [],
    all_employers: [{ company: 'BuildCo' }]
  })
  if (peSelection.sources.includes('npi')) {
    throw new Error('AC-1: PE license must not trigger NPI lookup')
  }
  if (!peSelection.notes.some((n) => /engineering license board/i.test(n))) {
    throw new Error('AC-1: PE license should suggest manual engineering board check')
  }

  const finraSelection = selectPublicSources({
    licenses_certifications: ['Series 7'],
    skills: [],
    all_employers: []
  })
  if (!finraSelection.sources.includes('finra')) {
    throw new Error('AC-2: Series 7 must trigger FINRA lookup')
  }

  const githubSelection = selectPublicSources({
    licenses_certifications: [],
    skills: ['Python', 'React'],
    all_employers: []
  })
  if (!githubSelection.sources.includes('github')) {
    throw new Error('AC-3: Python/React skills must trigger GitHub lookup')
  }

  process.env.RESUME_INTEL_E2E_GEMINI_FIXTURE = 'gemini-response-finra.json'
  const finraFields = JSON.parse(
    readFileSync(join(FIXTURES, 'gemini-response-finra.json'), 'utf8')
  )
  const finraResult = await checkPublicSources(finraFields)
  if (!finraResult.sourcesChecked.includes('finra') || !finraResult.results.finra?.found) {
    throw new Error('AC-2: FINRA fixture query should return results')
  }

  process.env.RESUME_INTEL_E2E_PUBLIC_TIMEOUT = 'github'
  const mixedFields = JSON.parse(readFileSync(join(FIXTURES, 'gemini-response.json'), 'utf8'))
  const mixedResult = await checkPublicSources(mixedFields)
  delete process.env.RESUME_INTEL_E2E_PUBLIC_TIMEOUT
  if (mixedResult.results.github?.status !== 'timed_out') {
    throw new Error('AC-4: GitHub should report timed out when E2E flag set')
  }
  if (mixedResult.results.openCorporates?.status !== 'ok') {
    throw new Error('AC-4: OpenCorporates should complete when GitHub times out')
  }

  delete process.env.RESUME_INTEL_E2E
  delete process.env.RESUME_INTEL_E2E_FIXTURES
  delete process.env.RESUME_INTEL_E2E_GEMINI_FIXTURE

  const ipc = readFileSync(join(ROOT, 'src/main/ipc-handlers.js'), 'utf8')
  if (!ipc.includes('checkPublicSources') || !ipc.includes('updateCandidatePublicRecords')) {
    throw new Error('ipc-handlers must run public records during enrichment')
  }

  return { ok: true, message: 'source selection, FINRA/GitHub fixtures, timeout isolation OK' }
}
