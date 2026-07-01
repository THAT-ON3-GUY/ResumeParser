/**
 * E2E tests — Feature 2.3 AI Summarization
 * Story: docs/features/02-ai-parsing/2.3-ai-summarization.md
 * testids: upload-input, result-row, view-detail-btn, detail-drawer,
 *           ai-summary-section, ai-summary-provider, ai-summary-text, ai-summary-confidence
 */
import { test, expect } from '@playwright/test'

import { withFreshApp, uploadAndParse, queryCandidates } from './helpers/electron-app.mjs'

const FEATURE = '2.3'

async function openFirstDetail(page) {
  await page.getByTestId('view-detail-btn').first().click()
  await expect(page.getByTestId('detail-drawer')).toBeVisible()
}

test.describe(`${FEATURE} — AI Summarization`, () => {
  test('AC-1: full search pipeline triggers summarization automatically', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows.length).toBe(1)
      expect(rows[0].ai_summary?.summary).toBeTruthy()
      expect(rows[0].ai_summary?.match_confidence).toBeTruthy()
    })
  })

  test('AC-2: detail drawer shows AI summary section with provider badge', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await openFirstDetail(page)
      await expect(page.getByTestId('ai-summary-section')).toBeVisible()
      await expect(page.getByTestId('ai-summary-provider')).toContainText('Gemini')
      await expect(page.getByTestId('ai-summary-text')).toContainText(/Acme Corp|LinkedIn/i)
    })
  })

  test('AC-3: sparse data yields insufficient_data summary without invented facts', async () => {
    await withFreshApp(
      {},
      async ({ page }) => {
        await uploadAndParse(page)
        const rows = await queryCandidates(page)
        expect(rows[0].ai_summary?.match_confidence).toBe('insufficient_data')
        expect(rows[0].ai_summary?.summary).toMatch(/insufficient data/i)
        await openFirstDetail(page)
        await expect(page.getByTestId('ai-summary-confidence')).toContainText('Insufficient data')
      },
      { ddgEmpty: true, summaryFixture: 'gemini-summary-sparse.json' }
    )
  })
})
