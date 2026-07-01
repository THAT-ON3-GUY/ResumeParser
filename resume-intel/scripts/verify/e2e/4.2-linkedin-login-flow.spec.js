/**
 * E2E tests — Feature 4.2 LinkedIn Login Flow
 * Story: docs/features/04-linkedin-integration/4.2-linkedin-login-flow.md
 * testids: settings-linkedin-connect, settings-linkedin-disconnect, settings-linkedin-status,
 *           linkedin-connect-prompt
 */
import { test, expect } from '@playwright/test'

import {
  seedStore,
  launchApp,
  relaunchApp,
  uploadAndParse,
  getSettings,
  acceptConfirmDialogs,
  cleanupUserData
} from './helpers/electron-app.mjs'

const FEATURE = '4.2'

test.describe(`${FEATURE} — LinkedIn Login Flow`, () => {
  test('AC-1: LinkedIn connection persists across app restart', async () => {
    const userDataDir = seedStore()
    let app = await launchApp(userDataDir)
    let page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-linkedin-connect').click()
    await expect(page.getByTestId('settings-linkedin-status')).toContainText('Connected')

    app = await relaunchApp(app, userDataDir)
    page = await app.firstWindow()
    await page.getByTestId('nav-settings').click()
    await expect(page.getByTestId('settings-linkedin-status')).toContainText('Connected')
    const settings = await getSettings(page)
    expect(settings.linkedinConnected).toBe(true)

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-2: disconnect clears session and shows not connected', async () => {
    const userDataDir = seedStore()
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-linkedin-connect').click()
    await expect(page.getByTestId('settings-linkedin-status')).toContainText('Connected')

    await page.getByTestId('settings-linkedin-disconnect').click()
    await expect(page.getByTestId('settings-linkedin-status')).toContainText('Not connected')
    const settings = await getSettings(page)
    expect(settings.linkedinConnected).toBe(false)

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-3: search pipeline prompts connect when LinkedIn URLs exist but session missing', async () => {
    const userDataDir = seedStore({ linkedinConnected: false })
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('linkedin-connect-prompt')).toBeVisible()

    await app.close()
    cleanupUserData(userDataDir)
  })
})
