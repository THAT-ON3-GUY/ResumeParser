/**
 * E2E tests — Feature 2.2 Claude Fallback AI Provider
 * Story: docs/features/02-ai-parsing/2.2-claude-fallback.md
 */
import path from 'node:path'

import { test, expect } from '@playwright/test'

import {
  withFreshApp,
  uploadAndParse,
  queryCandidates,
  FIXTURES_DIR
} from './helpers/electron-app.mjs'

const FEATURE = '2.2'

test.describe(`${FEATURE} — Claude Fallback`, () => {
  test('AC-1: Claude provider parses a resume successfully', async () => {
    await withFreshApp({ aiProvider: 'claude', claudeApiKey: 'e2e-test-key' }, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows.length).toBe(1)
      expect(rows[0].ai_provider).toBe('claude')
      expect(rows[0].extracted_fields.all_employers?.[0]?.company).toBe('Acme Corp')
    })
  })

  test('AC-2: missing Claude key surfaces a Settings error (no Gemini fallback)', async () => {
    await withFreshApp(
      { aiProvider: 'claude', claudeApiKey: '' },
      async ({ page }) => {
        const docx = path.join(FIXTURES_DIR, 'sample-resume.docx')
        await page.getByTestId('upload-input').setInputFiles(docx)
        await expect(
          page.getByTestId('result-status').filter({ hasText: 'Claude API key not set. Add it in Settings.' })
        ).toHaveCount(1, { timeout: 30000 })
      },
      { e2e: false }
    )
  })

  test('AC-3: summarization runs through Claude when provider is claude', async () => {
    await withFreshApp({ aiProvider: 'claude', claudeApiKey: 'e2e-test-key' }, async ({ page }) => {
      await uploadAndParse(page)
      const rows = await queryCandidates(page)
      expect(rows[0].ai_provider).toBe('claude')
      expect(rows[0].ai_summary?.summary).toBeTruthy()
    })
  })
})
