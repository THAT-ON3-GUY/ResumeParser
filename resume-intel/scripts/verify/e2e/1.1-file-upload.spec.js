/**
 * E2E tests — Feature 1.1 File Upload & Text Extraction
 * Story: docs/features/01-resume-ingestion/1.1-file-upload-and-extraction.md
 * testids: upload-zone, upload-input, upload-rejection, result-row, result-status
 */
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import {
  withFreshApp,
  uploadAndParse,
  FIXTURES_DIR
} from './helpers/electron-app.mjs'

const FEATURE = '1.1'

test.describe(`${FEATURE} — File Upload & Text Extraction`, () => {
  test('AC-1: valid PDF upload extracts text and completes parsing', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page, FIXTURES_DIR, 'sample-resume.pdf')
      await expect(page.getByTestId('result-row')).toHaveCount(1)
      await expect(page.getByTestId('result-status').filter({ hasText: 'Done' })).toHaveCount(1)
    })
  })

  test('AC-2: valid DOCX upload via file picker completes parsing', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page, FIXTURES_DIR, 'sample-resume.docx')
      await expect(page.getByTestId('result-row')).toHaveCount(1)
      await expect(page.getByTestId('result-status').filter({ hasText: 'Done' })).toHaveCount(1)
    })
  })

  test('AC-3: batch upload processes each file with its own status row', async () => {
    await withFreshApp({}, async ({ page }) => {
      const pdf = path.join(FIXTURES_DIR, 'sample-resume.pdf')
      const docx = path.join(FIXTURES_DIR, 'sample-resume.docx')
      await page.getByTestId('upload-input').setInputFiles([pdf, docx])
      await expect(page.getByTestId('result-row')).toHaveCount(2, { timeout: 30000 })
      await expect(page.getByTestId('result-status').filter({ hasText: 'Done' })).toHaveCount(2, {
        timeout: 60000
      })
    })
  })

  test('AC-4: unsupported .txt file shows rejection message', async () => {
    await withFreshApp({}, async ({ page }) => {
      const tempDir = mkdtempSync(path.join(tmpdir(), 'resume-intel-txt-'))
      const txtPath = path.join(tempDir, 'resume.txt')
      writeFileSync(txtPath, 'not a valid resume format')
      try {
        await page.getByTestId('upload-input').setInputFiles(txtPath)
        await expect(page.getByTestId('upload-rejection')).toHaveText('Unsupported file type')
        await expect(page.getByTestId('result-row')).toHaveCount(0)
      } finally {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  test('AC-5: minimal PDF shows scanned-file warning after extraction', async () => {
    await withFreshApp({}, async ({ page }) => {
      await uploadAndParse(page, FIXTURES_DIR, 'minimal-scanned.pdf')
      await expect(page.getByTestId('upload-warning')).toBeVisible()
      await expect(page.getByTestId('upload-warning')).toHaveAttribute(
        'title',
        'File may be scanned — text extraction returned minimal content.'
      )
      await expect(page.getByTestId('result-status').filter({ hasText: 'Done' })).toHaveCount(1)
    })
  })

  test('AC-6: one bad file in a batch does not block valid files', async () => {
    await withFreshApp({}, async ({ page }) => {
      const tempDir = mkdtempSync(path.join(tmpdir(), 'resume-intel-mixed-'))
      const badPath = path.join(tempDir, 'empty.pdf')
      writeFileSync(badPath, 'not a real pdf')
      const goodPath = path.join(FIXTURES_DIR, 'sample-resume.docx')
      try {
        await page.getByTestId('upload-input').setInputFiles([badPath, goodPath])
        await expect(page.getByTestId('result-status').filter({ hasText: 'Done' })).toHaveCount(1, {
          timeout: 60000
        })
        await expect(page.getByTestId('result-status').filter({ hasText: 'Error' })).toHaveCount(1)
      } finally {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })
})
