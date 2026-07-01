/**
 * E2E tests — Feature 6.1 Results Table
 * Story: docs/features/06-results-ui/6.1-results-table.md
 */
import path from 'node:path'
import { test, expect } from '@playwright/test'
import {
  withFreshApp,
  uploadAndParse,
  FIXTURES_DIR
} from './helpers/electron-app.mjs'

const FEATURE = '6.1'

test.describe(`${FEATURE} — Results Table`, () => {
  test('AC-1: table shows all required columns for batch uploads', async () => {
    await withFreshApp({}, async ({ page }) => {
      const sample = path.join(FIXTURES_DIR, 'sample-resume.pdf')
      const files = Array.from({ length: 10 }, () => sample)
      await page.getByTestId('upload-input').setInputFiles(files)

      await expect(page.getByTestId('result-row')).toHaveCount(10, { timeout: 120000 })
      await expect(page.getByTestId('sort-summaryTitle')).toBeVisible()
      await expect(page.getByTestId('sort-employer')).toBeVisible()
      await expect(page.getByTestId('sort-location')).toBeVisible()
      await expect(page.getByTestId('sort-confidence')).toBeVisible()
    })
  })

  test('AC-2: confidence column sorts high → medium → low', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await page.getByTestId('sort-confidence').click()
      await expect(page.getByTestId('sort-confidence')).toHaveAttribute('aria-sort', 'descending')
      await expect(page.locator('[data-testid^="badge-confidence-"]').first()).toHaveClass(/badge-high/)
    })
  })

  test('AC-3: LinkedIn found filter hides rows without LinkedIn signals', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await expect(page.getByTestId('result-row')).toHaveCount(1)
      await page.getByTestId('filter-linkedin').click()
      await expect(page.getByTestId('result-row')).toHaveCount(1)
    })

    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await page.getByTestId('filter-linkedin').click()
      await expect(page.getByTestId('result-row')).toHaveCount(0)
    }, { ddgEmpty: true })
  })

  test('AC-4: high confidence rows render a green badge', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await expect(page.locator('[data-testid^="badge-confidence-"]').first()).toHaveClass(/badge-high/)
    })
  })
})
