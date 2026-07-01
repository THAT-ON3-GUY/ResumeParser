/**
 * E2E tests — Feature 7.1 CSV & Excel Export
 * Story: docs/features/07-export/7.1-csv-excel-export.md
 */
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import XLSX from 'xlsx'
import {
  withFreshApp,
  uploadAndParse,
  FIXTURES_DIR,
  readExportPath
} from './helpers/electron-app.mjs'

const FEATURE = '7.1'

async function uploadBatch(page, count) {
  const sample = path.join(FIXTURES_DIR, 'sample-resume.pdf')
  await page.getByTestId('upload-input').setInputFiles(Array.from({ length: count }, () => sample))
  await expect(page.getByTestId('result-row')).toHaveCount(count, { timeout: 120000 })
  await expect(page.getByTestId('result-status').filter({ hasText: 'Done' })).toHaveCount(count, {
    timeout: 120000
  })
}

test.describe(`${FEATURE} — CSV & Excel Export`, () => {
  test('AC-1: Export Excel produces formatted workbook with Sources sheet', async () => {
    await withFreshApp({}, async ({ page, userDataDir }) => {
      await uploadBatch(page, 5)
      await page.getByTestId('export-all-excel').click()
      await expect(page.getByTestId('export-toast')).toBeVisible({ timeout: 15000 })

      const outPath = readExportPath(userDataDir)
      expect(outPath).toBeTruthy()
      expect(outPath.endsWith('.xlsx')).toBe(true)

      const workbook = XLSX.readFile(outPath)
      expect(workbook.SheetNames).toContain('Candidates')
      expect(workbook.SheetNames).toContain('Sources')

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Candidates)
      expect(rows.length).toBe(5)
    })
  })

  test('AC-2: Export CSV with row selection exports only checked candidates', async () => {
    await withFreshApp({}, async ({ page, userDataDir }) => {
      await uploadBatch(page, 3)
      const checkboxes = page.locator('[data-testid^="row-checkbox-"]:not([data-testid="row-checkbox-all"])')
      await checkboxes.nth(0).click()
      await checkboxes.nth(1).click()

      await page.getByTestId('export-selected-csv').click()
      await expect(page.getByTestId('export-toast')).toBeVisible({ timeout: 15000 })

      const outPath = readExportPath(userDataDir)
      const lines = readFileSync(outPath, 'utf8').trim().split('\n')
      expect(lines.length).toBe(3)
    })
  })

  test('AC-3: export completes with success toast and saved file path', async () => {
    await withFreshApp({}, async ({ page, userDataDir }) => {
      await uploadAndParse(page)
      await page.getByTestId('export-all-csv').click()
      await expect(page.getByTestId('export-toast')).toContainText(/Exported to Downloads\//i, {
        timeout: 15000
      })
      expect(readExportPath(userDataDir)).toMatch(/\.csv$/i)
    })
  })
})
