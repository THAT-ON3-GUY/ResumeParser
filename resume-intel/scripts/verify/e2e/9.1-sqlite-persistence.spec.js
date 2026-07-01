/**
 * E2E tests — Feature 9.1 Local SQLite Database
 * Story: docs/features/09-local-database/9.1-sqlite-persistence.md
 * testids: upload-input, result-row, result-delete, empty-table, settings-clear-all, nav-settings
 */
import { test, expect } from '@playwright/test'

import {
  seedStore,
  launchApp,
  relaunchApp,
  uploadAndParse,
  queryCandidates,
  acceptConfirmDialogs,
  cleanupUserData
} from './helpers/electron-app.mjs'

const FEATURE = '9.1'

test.describe(`${FEATURE} — Local SQLite Database`, () => {
  test('AC-1: parsed candidate persists after app restart', async () => {
    const userDataDir = seedStore()
    let app = await launchApp(userDataDir)
    let page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    await expect(page.getByTestId('result-row')).toHaveCount(1)

    app = await relaunchApp(app, userDataDir)
    page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    await expect(page.getByTestId('result-row')).toHaveCount(1)

    const rows = await queryCandidates(page)
    expect(rows.length).toBe(1)
    expect(rows[0].file_name).toMatch(/sample-resume\.(pdf|docx)$/)

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-2: deleted candidate row is removed from the table', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    await expect(page.getByTestId('result-row')).toHaveCount(1)
    await page.getByTestId('result-delete').first().click()
    await expect(page.getByTestId('empty-table')).toBeVisible()

    const rows = await queryCandidates(page)
    expect(rows.length).toBe(0)

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-3: clear all data leaves table empty after restart', async () => {
    const userDataDir = seedStore()
    let app = await launchApp(userDataDir)
    let page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-clear-all').click()

    app = await relaunchApp(app, userDataDir)
    page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    await expect(page.getByTestId('empty-table')).toBeVisible()

    const rows = await queryCandidates(page)
    expect(rows.length).toBe(0)

    await app.close()
    cleanupUserData(userDataDir)
  })
})
