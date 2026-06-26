import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, '../fixtures')
const ROOT = join(__dirname, '../../..')

export async function run() {
  const source = readFileSync(join(ROOT, 'src/main/search/linkedin.js'), 'utf8')
  for (const name of [
    'scrapeLinkedInProfile',
    'scrapeLinkedInForCandidate',
    'parseProfileFromHtml',
    'isLinkedInProfileUrl',
    'notifyLinkedInSessionExpired'
  ]) {
    if (!source.includes(`function ${name}`)) {
      throw new Error(`linkedin.js missing export: ${name}`)
    }
  }

  const ipc = readFileSync(join(ROOT, 'src/main/ipc-handlers.js'), 'utf8')
  if (!ipc.includes('scrapeLinkedInForCandidate') || !ipc.includes('updateCandidateLinkedInData')) {
    throw new Error('ipc-handlers must scrape LinkedIn and persist linkedin_data')
  }

  const drawer = readFileSync(join(ROOT, 'src/renderer/src/components/CandidateDetailDrawer.jsx'), 'utf8')
  if (!drawer.includes('linkedin-profile-card') || !drawer.includes('linkedin-session-expired')) {
    throw new Error('CandidateDetailDrawer missing LinkedIn profile UI')
  }

  const html = readFileSync(join(FIXTURES, 'linkedin-profile.html'), 'utf8')
  const userData = mkdtempSync(join(tmpdir(), 'ri-41-'))
  process.env.RESUME_INTEL_E2E_USER_DATA = userData
  process.env.RESUME_INTEL_E2E = '1'
  process.env.RESUME_INTEL_E2E_FIXTURES = FIXTURES

  const {
    parseProfileFromHtml,
    isLinkedInProfileUrl,
    scrapeLinkedInForCandidate,
    simulateLinkedInLoginForE2E,
    hasLinkedInSession,
    clearLinkedInSession
  } = await import('../../../src/main/search/linkedin.js')

  const profile = parseProfileFromHtml(html, 'https://www.linkedin.com/in/jane-recruit')
  if (profile.name !== 'Jane Recruit') throw new Error('AC-1: name parse failed')
  if (!profile.headline?.includes('Senior Engineer')) throw new Error('AC-1: headline parse failed')
  if (!profile.location?.includes('Boston')) throw new Error('AC-1: location parse failed')
  if (!profile.experience?.length || profile.experience[0].company !== 'Acme Corp') {
    throw new Error('AC-1: experience parse failed')
  }

  if (!isLinkedInProfileUrl('https://www.linkedin.com/in/jane-recruit')) {
    throw new Error('profile URL detection failed')
  }
  if (isLinkedInProfileUrl('https://www.linkedin.com/search/results')) {
    throw new Error('search URL should not match profile filter')
  }

  clearLinkedInSession()
  const skipped = await scrapeLinkedInForCandidate({
    results: [{ url: 'https://www.linkedin.com/in/jane-recruit', isLinkedIn: true }]
  })
  if (skipped.linkedinData !== null || skipped.sessionExpired) {
    throw new Error('AC-2: scrape should skip without session')
  }

  simulateLinkedInLoginForE2E()
  process.env.RESUME_INTEL_E2E_LINKEDIN_FIXTURE = 'login'
  const expired = await scrapeLinkedInForCandidate({
    results: [{ url: 'https://www.linkedin.com/in/jane-recruit', isLinkedIn: true }]
  })
  delete process.env.RESUME_INTEL_E2E_LINKEDIN_FIXTURE
  if (!expired.sessionExpired) throw new Error('AC-3: session expired not detected')
  if (hasLinkedInSession()) throw new Error('AC-3: cookies should be cleared after expiry')

  simulateLinkedInLoginForE2E()
  process.env.RESUME_INTEL_E2E_LINKEDIN_ATTEMPT_FIXTURES = '404,profile'
  const recovered = await scrapeLinkedInForCandidate({
    results: [
      { url: 'https://www.linkedin.com/in/missing-person', isLinkedIn: true },
      { url: 'https://www.linkedin.com/in/jane-recruit', isLinkedIn: true }
    ]
  })
  delete process.env.RESUME_INTEL_E2E_LINKEDIN_ATTEMPT_FIXTURES
  if (recovered.linkedinData?.name !== 'Jane Recruit') {
    throw new Error('AC-4: second profile URL should succeed after 404')
  }

  rmSync(userData, { recursive: true, force: true })
  delete process.env.RESUME_INTEL_E2E_USER_DATA
  delete process.env.RESUME_INTEL_E2E
  delete process.env.RESUME_INTEL_E2E_FIXTURES

  return {
    ok: true,
    message: 'parseProfileFromHtml, session skip/expiry, 404 fallback, IPC/UI hooks OK'
  }
}
