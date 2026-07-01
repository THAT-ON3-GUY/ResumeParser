import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import store from '../store.js'

import { parseGoogleItems } from './googleParse.js'
import { buildQuery } from './searchQuery.js'

export { parseGoogleItems } from './googleParse.js'

/** @typedef {{ title: string, snippet: string, url: string, isLinkedIn: boolean }} GoogleResultItem */
/** @typedef {{ query: string, results: GoogleResultItem[], searchedAt: string, source: 'google', error?: string }} GoogleSearchResult */

/**
 * @returns {boolean}
 */
export function hasGoogleSearchConfig() {
  const apiKey = String(store.get('googleSearchApiKey', '') ?? '').trim()
  const cxId = String(store.get('googleCxId', '') ?? '').trim()
  return Boolean(apiKey && cxId)
}

/**
 * @param {string} query
 * @returns {Promise<object>}
 */
async function fetchGoogleJson(query) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
    if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
    const file = process.env.RESUME_INTEL_E2E_GOOGLE_FIXTURE || 'google-search-response.json'
    console.log('[googleSearch] E2E fixture mode — loading', file)
    return JSON.parse(readFileSync(join(fixturesDir, file), 'utf8'))
  }

  const apiKey = store.get('googleSearchApiKey')
  const cxId = store.get('googleCxId')
  const url =
    'https://www.googleapis.com/customsearch/v1?' +
    new URLSearchParams({
      key: String(apiKey),
      cx: String(cxId),
      q: query,
      num: '5'
    }).toString()

  console.log('[googleSearch] fetching Custom Search API')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message ?? JSON.stringify(data).slice(0, 300)
      throw new Error(`Google Custom Search API error (${res.status}): ${msg}`)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * @param {object|null} extractedFields
 * @returns {Promise<GoogleSearchResult | null>}
 */
export async function searchGoogle(extractedFields) {
  if (!hasGoogleSearchConfig()) {
    console.log('[googleSearch] skipped — API key or CX ID not configured')
    return null
  }

  const query = buildQuery(extractedFields, { linkedInOnly: true })
  console.log('[googleSearch] searchGoogle start —', query)

  try {
    const data = await fetchGoogleJson(query)
    const results = parseGoogleItems(data?.items)
    const out = {
      query,
      results,
      searchedAt: new Date().toISOString(),
      source: 'google'
    }
    console.log('[googleSearch] searchGoogle done —', results.length, 'results')
    return out
  } catch (err) {
    const message = err?.message ?? String(err)
    console.error('[googleSearch] search failed', message)
    return {
      query,
      results: [],
      searchedAt: new Date().toISOString(),
      source: 'google',
      error: message
    }
  }
}
