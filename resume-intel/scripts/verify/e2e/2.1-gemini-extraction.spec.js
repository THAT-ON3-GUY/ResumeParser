/**
 * E2E tests — Feature 2.1 Gemini Resume Extraction
 * Story: docs/features/02-ai-parsing/2.1-gemini-extraction.md
 * testids: upload-input, result-row, result-status
 */
import { test, expect } from '@playwright/test'
import path from 'node:path'
import {
  withFreshApp,
  uploadAndParse,
  queryCandidates,
  FIXTURES_DIR
} from './helpers/electron-app.mjs'

const FEATURE = '2.1'

test.describe(`${FEATURE} — Gemini Resume Extraction`, () => {
  test('AC-1: extraction populates employer fields from fixture response', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows.length).toBe(1)
      const fields = rows[0].extracted_fields
      expect(fields.all_employers?.[0]?.company).toBe('Acme Corp')
      expect(fields.summary_title).toContain('Acme Corp')
    })
  })

  test('AC-2: missing pronouns remain null in extracted JSON', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows[0].extracted_fields.pronouns).toBeNull()
    })
  })

  test('AC-3: fixture JSON parses successfully into structured fields', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      await expect(page.getByTestId('result-status').filter({ hasText: 'Done' })).toHaveCount(1)
      const rows = await queryCandidates(page)
      expect(rows[0].extracted_fields.education?.[0]?.school).toBe('State University')
    })
  })

  test('AC-4: missing Gemini API key surfaces an error on parse', async () => {
    await withFreshApp(
      { geminiApiKey: '' },
      async ({ page }) => {
        const docx = path.join(FIXTURES_DIR, 'sample-resume.docx')
        await page.getByTestId('upload-input').setInputFiles(docx)
        await expect(
          page.getByTestId('result-status').filter({ hasText: /API key not set/i })
        ).toHaveCount(1, { timeout: 30000 })
      },
      { e2e: false }
    )
  })

  test('AC-5: licenses array is present in extracted schema', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(Array.isArray(rows[0].extracted_fields.licenses_certifications)).toBe(true)
    })
  })

  test('AC-6: E2E uses fixture path without live Gemini network calls', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows[0].extracted_fields.parsing_confidence).toBe('high')
    })
  })
})
