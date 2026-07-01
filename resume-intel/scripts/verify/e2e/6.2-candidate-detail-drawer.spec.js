/**
 * E2E tests — Feature 6.2 Candidate Detail Drawer
 * Story: docs/features/06-results-ui/6.2-candidate-detail-drawer.md
 */
import { test, expect } from '@playwright/test'

import { withFreshApp, uploadAndParse } from './helpers/electron-app.mjs'

const FEATURE = '6.2'

async function openFirstDetail(page) {
  await page.getByTestId('view-detail-btn').first().click()
  await expect(page.getByTestId('detail-drawer')).toBeVisible()
}

test.describe(`${FEATURE} — Candidate Detail Drawer`, () => {
  test('AC-1: drawer shows all parsed field sections', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await openFirstDetail(page)
      const drawer = page.getByTestId('detail-drawer')

      await expect(drawer.getByText('Summary title', { exact: true })).toBeVisible()
      await expect(drawer.getByText('Employment timeline', { exact: true })).toBeVisible()
      await expect(drawer.getByText('Education', { exact: true })).toBeVisible()
      await expect(drawer.getByText('Skills', { exact: true })).toBeVisible()
      await expect(drawer.getByText('Search results', { exact: true })).toBeVisible()
      await expect(drawer.getByText('AI summary', { exact: true })).toBeVisible()
    })
  })

  test('AC-2: employment timeline matches parser employer order', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await openFirstDetail(page)

      await expect(page.getByTestId('employer-timeline-item-0')).toContainText('Acme Corp')
      await expect(page.getByTestId('employer-timeline-item-0')).toContainText('Senior Engineer')
    })
  })

  test('AC-3: search and summary sections populate after enrichment', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await openFirstDetail(page)

      await expect(page.getByTestId('search-results-list')).toBeVisible()
      await expect(page.getByTestId('ai-summary-section')).toBeVisible()
      await expect(page.getByTestId('ai-summary-provider')).toContainText('Gemini')
    })
  })

  test('FR-1: drawer closes via button, backdrop, and Escape', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await openFirstDetail(page)

      await page.getByTestId('detail-close').click()
      await expect(page.getByTestId('detail-drawer')).toHaveCount(0)

      await openFirstDetail(page)
      await page.getByTestId('detail-backdrop').click({ position: { x: 4, y: 4 } })
      await expect(page.getByTestId('detail-drawer')).toHaveCount(0)

      await openFirstDetail(page)
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('detail-drawer')).toHaveCount(0)
    })
  })

  test('FR-3: collapsible source quotes reveal resume text excerpts', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await openFirstDetail(page)

      const quote = page.getByTestId('source-quote-employer-0')
      await expect(quote).toBeVisible()
      await quote.locator('summary').click()
      await expect(page.getByTestId('source-quote-text-employer-0')).toContainText(/Acme Corp/i)
    })
  })
})
