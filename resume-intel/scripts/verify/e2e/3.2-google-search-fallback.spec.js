/**
 * E2E tests — Feature 3.2 Google Search Fallback
 * Story: docs/features/03-candidate-search/3.2-google-search-fallback.md
 */
import { test, expect } from '@playwright/test'

import {
  withFreshApp,
  uploadAndParse,
  queryCandidates
} from './helpers/electron-app.mjs'

const FEATURE = '3.2'

async function openFirstDetail(page) {
  await page.getByTestId('view-detail-btn').first().click()
  await expect(page.getByTestId('detail-drawer')).toBeVisible()
}

test.describe(`${FEATURE} — Google Search Fallback`, () => {
  test('AC-1: Google fallback runs when DDG is empty and keys are configured', async () => {
    await withFreshApp(
      { googleSearchApiKey: 'e2e-google-key', googleCxId: 'e2e-cx-id' },
      async ({ page }) => {
        await uploadAndParse(page)
        const rows = await queryCandidates(page)
        expect(rows[0].search_results?.source).toBe('google')
        expect(rows[0].search_results?.results?.length).toBeGreaterThan(0)
        await openFirstDetail(page)
        await expect(page.getByTestId('search-source')).toHaveText(/google/i)
      },
      { e2e: true, ddgEmpty: true }
    )
  })

  test('AC-2: no Google keys leaves empty results without error', async () => {
    await withFreshApp(
      { googleSearchApiKey: '', googleCxId: '' },
      async ({ page }) => {
        await uploadAndParse(page)
        const rows = await queryCandidates(page)
        expect(Array.isArray(rows[0].search_results?.results)).toBe(true)
        expect(rows[0].search_results.results.length).toBe(0)
      },
      { e2e: true, ddgEmpty: true }
    )
  })

  test('AC-3: Google LinkedIn URLs are flagged isLinkedIn', async () => {
    await withFreshApp(
      { googleSearchApiKey: 'e2e-google-key', googleCxId: 'e2e-cx-id' },
      async ({ page }) => {
        await uploadAndParse(page)
        const rows = await queryCandidates(page)
        const hit = rows[0].search_results?.results?.find((r) => r.isLinkedIn)
        expect(hit?.url).toMatch(/linkedin\.com\/in\//i)
      },
      { e2e: true, ddgEmpty: true }
    )
  })

  test('AC-4: DDG results prevent Google fallback', async () => {
    await withFreshApp(
      { googleSearchApiKey: 'e2e-google-key', googleCxId: 'e2e-cx-id' },
      async ({ page }) => {
        await uploadAndParse(page)
        const rows = await queryCandidates(page)
        expect(rows[0].search_results?.source).toBe('duckduckgo')
        expect(rows[0].search_results?.results?.length).toBeGreaterThan(0)
      },
      { e2e: true }
    )
  })
})
