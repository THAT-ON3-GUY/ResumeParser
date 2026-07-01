/**
 * E2E tests — Feature 5.1 Public Records API Lookups
 * Story: docs/features/05-public-records/5.1-public-source-apis.md
 */
import { test, expect } from '@playwright/test'

import {
  seedStore,
  launchApp,
  uploadAndParse,
  queryCandidates,
  acceptConfirmDialogs,
  cleanupUserData
} from './helpers/electron-app.mjs'

const FEATURE = '5.1'

test.describe(`${FEATURE} — Public Records`, () => {
  test('AC-1: PE license skips NPI and suggests engineering board check', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir, { geminiFixture: 'gemini-response-pe.json' })
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    const candidates = await queryCandidates(page)
    const records = candidates[0].public_records
    expect(records.sourcesChecked).not.toContain('npi')
    expect(records.notes.join(' ')).toMatch(/engineering license board/i)

    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('public-records-notes')).toContainText(/engineering license board/i)

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-2: Series 7 triggers FINRA lookup with stored results', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir, { geminiFixture: 'gemini-response-finra.json' })
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    const candidates = await queryCandidates(page)
    expect(candidates[0].public_records.sourcesChecked).toContain('finra')
    expect(candidates[0].public_records.results.finra.found).toBe(true)

    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('public-records-finra')).toContainText('Results found')

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-3: Python and React skills trigger GitHub lookup', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    const candidates = await queryCandidates(page)
    expect(candidates[0].public_records.sourcesChecked).toContain('github')
    expect(candidates[0].public_records.results.github.found).toBe(true)

    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('public-records-github')).toContainText('Results found')

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-4: one timed-out source does not block other sources', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir, { publicTimeout: 'github' })
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    const candidates = await queryCandidates(page)
    expect(candidates[0].public_records.results.github.status).toBe('timed_out')
    expect(candidates[0].public_records.results.openCorporates.status).toBe('ok')

    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('public-records-github')).toContainText('Timed out')
    await expect(page.getByTestId('public-records-openCorporates')).toContainText('Results found')

    await app.close()
    cleanupUserData(userDataDir)
  })
})
