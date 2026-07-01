/**
 * E2E tests — Feature 3.1 DuckDuckGo Candidate Search
 * Story: docs/features/03-candidate-search/3.1-duckduckgo-search.md
 * testids: upload-input, result-row, view-detail-btn, detail-drawer,
 *           search-results-list, search-result-card, search-results-empty
 */
import { test, expect } from '@playwright/test'

import {
  withFreshApp,
  uploadAndParse,
  queryCandidates
} from './helpers/electron-app.mjs'

const FEATURE = '3.1'

async function openFirstDetail(page) {
  await page.getByTestId('view-detail-btn').first().click()
  await expect(page.getByTestId('detail-drawer')).toBeVisible()
}

test.describe(`${FEATURE} — DuckDuckGo Candidate Search`, () => {
  test('AC-1: search returns a LinkedIn profile URL for employer and school signals', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await openFirstDetail(page)
      const linkedInCard = page.getByTestId('search-result-card').filter({ hasText: /linkedin\.com\/in\//i })
      await expect(linkedInCard).toHaveCount(1)
      await expect(linkedInCard.first()).toHaveAttribute('data-linkedin', 'true')
    })
  })

  test('AC-2: zero DDG results store an empty array without breaking parse', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows.length).toBe(1)
      expect(Array.isArray(rows[0].search_results?.results)).toBe(true)
      expect(rows[0].search_results.results.length).toBe(0)
    }, { e2e: true, ddgEmpty: true })
  })

  test('AC-3: auto-search runs after upload without error', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows[0].search_results?.searchedAt).toBeTruthy()
    })
  })

  test('AC-4: LinkedIn URLs are flagged isLinkedIn in stored search results', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      const hit = rows[0].search_results?.results?.[0]
      expect(hit?.isLinkedIn).toBe(true)
      expect(hit?.url).toMatch(/linkedin\.com\/in\//i)
    })
  })
})
