import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import store from '../store.js'
import { getSettings } from '../settings.js'

const LOGIN_URL = 'https://www.linkedin.com/login'
const PROFILE_PATH_RE = /^\/in\/[^/?#]+\/?$/i

let lastProfileScrapeFinishedAt = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isLinkedInProfileUrl(url) {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('linkedin.com')) return false
    return PROFILE_PATH_RE.test(u.pathname)
  } catch {
    return false
  }
}

export function hasLinkedInSession() {
  const cookies = store.get('linkedinCookies', [])
  return Boolean(store.get('linkedinConnected')) && Array.isArray(cookies) && cookies.length > 0
}

export function getLinkedInCookies() {
  return store.get('linkedinCookies', [])
}

export function clearLinkedInSession() {
  console.log('[linkedin] clearLinkedInSession')
  store.delete('linkedinCookies')
  store.set('linkedinConnected', false)
  store.delete('linkedinConnectedAt')
}

export function simulateLinkedInLoginForE2E() {
  console.log('[linkedin] E2E simulate login')
  store.set('linkedinCookies', [
    {
      name: 'li_at',
      value: 'e2e-mock-session-token',
      domain: '.linkedin.com',
      path: '/',
      secure: true,
      httpOnly: true
    }
  ])
  store.set('linkedinConnected', true)
  store.set('linkedinConnectedAt', new Date().toISOString())
  return getSettings()
}

function isLoginSuccessUrl(url) {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('linkedin.com')) return false
    if (u.pathname.includes('/login') || u.pathname.includes('/checkpoint')) return false
    return (
      u.pathname.startsWith('/feed') ||
      u.pathname.startsWith('/in/') ||
      u.pathname.startsWith('/mynetwork')
    )
  } catch {
    return false
  }
}

export function isLoginRedirectUrl(url) {
  try {
    const u = new URL(url)
    return u.hostname.includes('linkedin.com') && u.pathname.includes('/login')
  } catch {
    return false
  }
}

export function isNotFoundHtml(html) {
  const text = String(html).toLowerCase()
  return text.includes('page not found') || text.includes('this page doesn') || text.includes('profile-not-found')
}

/**
 * @param {string} html
 * @param {string} profileUrl
 */
export function parseProfileFromHtml(html, profileUrl) {
  const pick = (re) => {
    const m = html.match(re)
    return m?.[1]?.replace(/<[^>]+>/g, '').trim() || null
  }

  const experience = []
  const expBlocks = html.matchAll(
    /<div class="experience-entry"[^>]*>[\s\S]*?<span class="exp-title">([^<]*)<\/span>[\s\S]*?<span class="exp-company">([^<]*)<\/span>[\s\S]*?<span class="exp-duration">([^<]*)<\/span>/gi
  )
  for (const m of expBlocks) {
    experience.push({ title: m[1].trim(), company: m[2].trim(), duration: m[3].trim() })
    if (experience.length >= 5) break
  }

  const education = []
  const eduBlocks = html.matchAll(
    /<div class="education-entry"[^>]*>[\s\S]*?<span class="edu-school">([^<]*)<\/span>[\s\S]*?<span class="edu-degree">([^<]*)<\/span>/gi
  )
  for (const m of eduBlocks) {
    education.push({ school: m[1].trim(), degree: m[2].trim() })
  }

  return {
    profileUrl,
    name: pick(/<h1[^>]*>([^<]+)<\/h1>/i),
    headline: pick(/class="text-body-medium"[^>]*>([^<]+)</i),
    location: pick(/class="text-body-small inline"[^>]*>([^<]+)</i),
    about: pick(/class="profile-about"[^>]*>([^<]+)</i),
    experience,
    education,
    contactInfo: pick(/class="contact-info"[^>]*>([^<]+)</i),
    scrapedAt: new Date().toISOString()
  }
}

async function saveLinkedInCookiesFromSession(electronSession) {
  const cookies = await electronSession.cookies.get({ domain: '.linkedin.com' })
  const linkedinCookies = cookies.filter((c) => c.domain?.includes('linkedin.com'))
  console.log('[linkedin] saving', linkedinCookies.length, 'cookies')
  store.set('linkedinCookies', linkedinCookies)
  const connected = linkedinCookies.some((c) => c.name === 'li_at' || c.name === 'JSESSIONID')
  store.set('linkedinConnected', connected)
  if (connected) {
    store.set('linkedinConnectedAt', new Date().toISOString())
  }
  return linkedinCookies
}

async function applyStoredCookiesToSession(electronSession) {
  const cookies = getLinkedInCookies()
  for (const cookie of cookies) {
    try {
      await electronSession.cookies.set({
        url: `https://${cookie.domain?.replace(/^\./, '')}${cookie.path || '/'}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        secure: cookie.secure ?? true,
        httpOnly: cookie.httpOnly ?? true,
        expirationDate: cookie.expirationDate
      })
    } catch (err) {
      console.warn('[linkedin] failed to set cookie', cookie.name, err.message)
    }
  }
}

async function enforceProfileDelay() {
  if (process.env.RESUME_INTEL_E2E === '1') return
  const minGapMs = 5000
  if (!lastProfileScrapeFinishedAt) return
  const elapsed = Date.now() - lastProfileScrapeFinishedAt
  if (elapsed < minGapMs) {
    const jitter = Math.floor(Math.random() * 5000)
    await sleep(minGapMs - elapsed + jitter)
  }
}

function loadE2EFixtureHtml(mode) {
  const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
  if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
  const file =
    mode === '404'
      ? 'linkedin-profile-404.html'
      : mode === 'login'
        ? 'linkedin-login.html'
        : 'linkedin-profile.html'
  return readFileSync(join(fixturesDir, file), 'utf8')
}

/**
 * @param {string} profileUrl
 * @returns {Promise<{ data?: object, sessionExpired?: boolean, notFound?: boolean }>}
 */
export async function scrapeLinkedInProfile(profileUrl, attemptIndex = 0) {
  if (!isLinkedInProfileUrl(profileUrl)) {
    console.log('[linkedin] skip non-profile URL', profileUrl)
    return { notFound: true }
  }

  console.log('[linkedin] scrapeLinkedInProfile', profileUrl)

  if (process.env.RESUME_INTEL_E2E === '1') {
    const attemptFixtures =
      process.env.RESUME_INTEL_E2E_LINKEDIN_ATTEMPT_FIXTURES?.split(',').map((s) => s.trim()) ??
      []
    const mode =
      attemptFixtures[attemptIndex] ||
      process.env.RESUME_INTEL_E2E_LINKEDIN_FIXTURE ||
      'profile'
    if (mode === 'login') return { sessionExpired: true }
    if (mode === '404') return { notFound: true }
    const html = loadE2EFixtureHtml('profile')
    lastProfileScrapeFinishedAt = Date.now()
    return { data: parseProfileFromHtml(html, profileUrl) }
  }

  await enforceProfileDelay()

  const { BrowserWindow } = await import('electron')
  const scrapeWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  try {
    await applyStoredCookiesToSession(scrapeWindow.webContents.session)
    await scrapeWindow.loadURL(profileUrl, { timeout: 15000 })
    const finalUrl = scrapeWindow.webContents.getURL()
    if (isLoginRedirectUrl(finalUrl)) {
      console.log('[linkedin] session expired — login redirect')
      return { sessionExpired: true }
    }
    const html = await scrapeWindow.webContents.executeJavaScript(
      'document.documentElement.outerHTML'
    )
    if (isNotFoundHtml(html)) {
      console.log('[linkedin] profile not found', profileUrl)
      return { notFound: true }
    }
    lastProfileScrapeFinishedAt = Date.now()
    return { data: parseProfileFromHtml(html, profileUrl) }
  } catch (err) {
    console.error('[linkedin] scrape failed', err.message)
    return { notFound: true }
  } finally {
    if (!scrapeWindow.isDestroyed()) scrapeWindow.close()
  }
}

/**
 * @param {object|null} searchResults
 * @returns {Promise<{ linkedinData: object|null, sessionExpired: boolean }>}
 */
export async function scrapeLinkedInForCandidate(searchResults) {
  if (!hasLinkedInSession()) {
    console.log('[linkedin] skip scrape — not connected')
    return { linkedinData: null, sessionExpired: false }
  }

  const urls = (searchResults?.results ?? [])
    .filter((r) => r.isLinkedIn && isLinkedInProfileUrl(r.url))
    .map((r) => r.url)
    .slice(0, 2)

  if (!urls.length) {
    return { linkedinData: null, sessionExpired: false }
  }

  for (let i = 0; i < urls.length; i++) {
    const outcome = await scrapeLinkedInProfile(urls[i], i)
    if (outcome.sessionExpired) {
      clearLinkedInSession()
      return { linkedinData: null, sessionExpired: true }
    }
    if (outcome.notFound) continue
    if (outcome.data) return { linkedinData: outcome.data, sessionExpired: false }
  }

  return { linkedinData: null, sessionExpired: false }
}

export function openLinkedInLogin(parentWindow) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    return Promise.resolve(simulateLinkedInLoginForE2E())
  }

  return import('electron').then(({ BrowserWindow }) =>
    new Promise((resolve, reject) => {
      const loginWindow = new BrowserWindow({
      width: 520,
      height: 760,
      title: 'Connect LinkedIn — Resume Intel',
      parent: parentWindow ?? undefined,
      modal: Boolean(parentWindow),
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    let settled = false

    const finish = async (ok, err) => {
      if (settled) return
      settled = true
      try {
        if (ok) {
          await saveLinkedInCookiesFromSession(loginWindow.webContents.session)
          if (!hasLinkedInSession()) {
            reject(new Error('Login finished but no LinkedIn session cookies were found'))
            return
          }
          resolve(getSettings())
        } else {
          reject(err ?? new Error('LinkedIn login was not completed'))
        }
      } finally {
        if (!loginWindow.isDestroyed()) loginWindow.close()
      }
    }

    loginWindow.on('closed', () => {
      if (!settled) finish(false, new Error('LinkedIn login window closed'))
    })

    const onNavigate = (_event, url) => {
      console.log('[linkedin] navigate', url)
      if (isLoginSuccessUrl(url)) finish(true)
    }

    loginWindow.webContents.on('did-navigate', onNavigate)
    loginWindow.webContents.on('did-navigate-in-page', onNavigate)

    loginWindow.loadURL(LOGIN_URL).catch((err) => finish(false, err))
    })
  )
}

export function notifyLinkedInConnected(mainWindow, settings = getSettings()) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('[linkedin] notify renderer linkedin:connected')
    mainWindow.webContents.send('linkedin:connected', settings)
  }
}

export function notifyLinkedInSessionExpired(mainWindow) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('[linkedin] notify renderer linkedin:session-expired')
    mainWindow.webContents.send('linkedin:session-expired', getSettings())
  }
}

export function requireLinkedInSessionForScrape() {
  if (hasLinkedInSession()) return true
  console.log('[linkedin] session missing — profile scrape requires Connect in Settings')
  return false
}

export function resetProfileScrapeDelayForTests() {
  lastProfileScrapeFinishedAt = 0
}
