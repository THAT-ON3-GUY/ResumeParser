/**
 * E2E tests — Feature 8.1 Settings Panel
 * Story: docs/features/08-settings/8.1-settings-panel.md
 * testids: nav-settings, settings-panel, settings-gemini-key, settings-gemini-status,
 *           settings-ai-claude, settings-link-gemini, settings-clear-all, empty-table
 */
import { test, expect } from '@playwright/test'

import {
  seedStore,
  launchApp,
  relaunchApp,
  uploadAndParse,
  readExternalUrl,
  clearExternalUrl,
  getSettings,
  acceptConfirmDialogs,
  cleanupUserData
} from './helpers/electron-app.mjs'

const FEATURE = '8.1'

test.describe(`${FEATURE} — Settings Panel`, () => {
  test('AC-1: Gemini API key persists after app restart', async () => {
    const userDataDir = seedStore({ geminiApiKey: 'persist-test-key' })
    let app = await launchApp(userDataDir)
    let page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await page.getByTestId('nav-settings').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()
    await expect(page.getByTestId('settings-gemini-status')).toContainText('Set')

    app = await relaunchApp(app, userDataDir)
    page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)
    await page.getByTestId('nav-settings').click()
    await expect(page.getByTestId('settings-gemini-status')).toContainText('Set')
    const settings = await getSettings(page)
    expect(settings.geminiApiKey).toBe('persist-test-key')

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-2: Claude provider selection persists in settings store', async () => {
    const userDataDir = seedStore({ aiProvider: 'gemini' })
    let app = await launchApp(userDataDir)
    let page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-ai-claude').check()
    await expect(page.getByTestId('settings-ai-claude')).toBeChecked()

    app = await relaunchApp(app, userDataDir)
    page = await app.firstWindow()
    await page.getByTestId('nav-settings').click()
    const settings = await getSettings(page)
    expect(settings.aiProvider).toBe('claude')

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-3: Gemini helper link opens external URL via shell mock', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    clearExternalUrl(userDataDir)

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-link-gemini').click()
    expect(readExternalUrl(userDataDir)).toBe('https://aistudio.google.com')

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-4: Clear all data empties the candidates table after confirmation', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    await expect(page.getByTestId('result-row')).toHaveCount(1)

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-clear-all').click()
    await page.getByTestId('nav-candidates').click()
    await expect(page.getByTestId('empty-table')).toBeVisible()

    await app.close()
    cleanupUserData(userDataDir)
  })
})
