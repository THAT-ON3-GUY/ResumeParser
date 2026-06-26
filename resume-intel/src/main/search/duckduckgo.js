import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** @typedef {{ title: string, snippet: string, url: string, isLinkedIn: boolean }} DDGResultItem */
/** @typedef {{ query: string, results: DDGResultItem[], searchedAt: string }} DDGSearchResult */

let lastSearchFinishedAt = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {object|null} extractedFields
 * @param {{ linkedInOnly?: boolean }} options
 */
export function buildQuery(extractedFields, { linkedInOnly = true } = {}) {
  const parts = []
  const employer =
    extractedFields?.current_or_most_recent_employer?.company ??
    extractedFields?.all_employers?.[0]?.company ??
    extractedFields?.previous_employers?.[0]?.company

  if (employer) parts.push(`"${employer}"`)

  const edu = extractedFields?.education?.[0]
  if (edu?.graduation_year != null) parts.push(String(edu.graduation_year))
  if (edu?.school) parts.push(`"${edu.school}"`)

  const license = extractedFields?.licenses_certifications?.[0]?.name
  if (license) parts.push(`"${license}"`)

  if (linkedInOnly) parts.push('site:linkedin.com/in')

  return parts.filter(Boolean).join(' ')
}

function flagLinkedIn(url) {
  return /linkedin\.com\/in\//i.test(url || '')
}

/**
 * @param {string} html
 * @returns {Promise<DDGResultItem[]>}
 */
export async function parseDdgHtml(html) {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const results = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.result')]
      return rows.slice(0, 5).map((row) => {
        const titleEl = row.querySelector('.result__title a, .result__a, a.result__a')
        const snippetEl = row.querySelector('.result__snippet')
        const urlEl = row.querySelector('.result__url, a.result__url') || titleEl
        const href = urlEl?.href || urlEl?.getAttribute('href') || ''
        return {
          title: (titleEl?.textContent || '').trim(),
          snippet: (snippetEl?.textContent || '').trim(),
          url: href,
          isLinkedIn: /linkedin\.com\/in\//i.test(href)
        }
      })
    })
    return results
  } finally {
    await browser.close()
  }
}

function wrapResult(query, results) {
  /** @type {DDGSearchResult} */
  return {
    query,
    results: results.map((r) => ({
      ...r,
      isLinkedIn: flagLinkedIn(r.url)
    })),
    searchedAt: new Date().toISOString()
  }
}

async function enforceSearchDelay() {
  const minGapMs = 2000
  if (!lastSearchFinishedAt) return
  const elapsed = Date.now() - lastSearchFinishedAt
  if (elapsed < minGapMs) {
    const jitter = 200 + Math.floor(Math.random() * 800)
    await sleep(minGapMs - elapsed + jitter)
  }
}

async function fetchDdgHtml(query) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
    if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
    const useEmpty = process.env.RESUME_INTEL_E2E_DDG_EMPTY === '1'
    const file = useEmpty ? 'ddg-results-empty.html' : 'ddg-results.html'
    console.log('[duckduckgo] E2E fixture mode — loading', file)
    return readFileSync(join(fixturesDir, file), 'utf8')
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    console.log('[duckduckgo] Fetching', url)
    await page.goto(url, { timeout: 10000, waitUntil: 'domcontentloaded' })
    return await page.content()
  } finally {
    await browser.close()
  }
}

/**
 * @param {object|null} extractedFields
 * @returns {Promise<DDGSearchResult>}
 */
export async function searchDuckDuckGo(extractedFields) {
  await enforceSearchDelay()
  console.log('[duckduckgo] searchDuckDuckGo start')

  let query = buildQuery(extractedFields, { linkedInOnly: true })
  let html = await fetchDdgHtml(query)
  let results = await parseDdgHtml(html)

  if (!results.length) {
    const fallbackQuery = buildQuery(extractedFields, { linkedInOnly: false })
    if (fallbackQuery && fallbackQuery !== query) {
      console.log('[duckduckgo] No results — retry without site:linkedin.com/in')
      query = fallbackQuery
      html = await fetchDdgHtml(query)
      results = await parseDdgHtml(html)
    }
  }

  lastSearchFinishedAt = Date.now()
  const out = wrapResult(query, results)
  console.log('[duckduckgo] searchDuckDuckGo done —', out.results.length, 'results')
  return out
}

/** Test helper — ms since previous search finished (0 if none yet). */
export function msSinceLastSearch() {
  if (!lastSearchFinishedAt) return Infinity
  return Date.now() - lastSearchFinishedAt
}

export function resetSearchDelayForTests() {
  lastSearchFinishedAt = 0
}

export function markSearchFinishedForTests() {
  lastSearchFinishedAt = Date.now()
}
