/**
 * E2E tests — Feature 10.1 App Packaging & First Launch
 * Story: docs/features/10-packaging/10.1-installer-packaging.md
 */
import { test, expect } from '@playwright/test'
import { withFreshApp } from './helpers/electron-app.mjs'

const FEATURE = '10.1'

test.describe(`${FEATURE} — Packaging & First Launch`, () => {
  test('AC-2: first launch with no API key opens Settings welcome banner', async () => {
    await withFreshApp(
      { geminiApiKey: '', aiProvider: 'gemini' },
      async ({ page }) => {
        await expect(page.getByTestId('settings-view')).toBeVisible({ timeout: 15000 })
        await expect(page.getByTestId('welcome-banner')).toHaveText(/Gemini API key/i)
        await expect(page.getByTestId('settings-gemini-key')).toBeVisible()
      },
      { waitForView: 'settings' }
    )
  })

  test('AC-2: after key is set user can reach candidates view', async () => {
    await withFreshApp({ geminiApiKey: 'e2e-test-key', aiProvider: 'gemini' }, async ({ page }) => {
      await expect(page.getByTestId('candidates-view')).toBeVisible({ timeout: 15000 })
      await expect(page.getByTestId('settings-view')).not.toBeVisible()
    })
  })
})
