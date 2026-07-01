/**
 * E2E tests — Feature 4.1 LinkedIn Authenticated Profile Scraping
 * Story: docs/features/04-linkedin-integration/4.1-linkedin-authenticated-scraping.md
 * testids: linkedin-profile-card, linkedin-profile-name, linkedin-session-expired, linkedin-profile-empty
 */
import { test, expect } from '@playwright/test'

import {
  seedStore,
  launchApp,
  uploadAndParse,
  queryCandidates,
  getSettings,
  acceptConfirmDialogs,
  cleanupUserData
} from './helpers/electron-app.mjs'

const FEATURE = '4.1'

const LINKEDIN_COOKIE = {
  name: 'li_at',
  value: 'e2e-mock-session-token',
  domain: '.linkedin.com',
  path: '/',
  secure: true,
  httpOnly: true
}

test.describe(`${FEATURE} — LinkedIn Profile Scraping`, () => {
  test('AC-1: connected session scrapes name, headline, and location', async () => {
    const userDataDir = seedStore({
      linkedinConnected: true,
      linkedinCookies: [LINKEDIN_COOKIE]
    })
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('linkedin-profile-card')).toBeVisible()
    await expect(page.getByTestId('linkedin-profile-name')).toContainText('Jane Recruit')
    await expect(page.getByTestId('linkedin-profile-headline')).toContainText('Senior Engineer')
    await expect(page.getByTestId('linkedin-profile-location')).toContainText('Boston')

    const candidates = await queryCandidates(page)
    expect(candidates[0].linkedin_data?.name).toBe('Jane Recruit')

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-2: without session linkedin_data stays null', async () => {
    const userDataDir = seedStore({ linkedinConnected: false })
    const app = await launchApp(userDataDir)
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    const candidates = await queryCandidates(page)
    expect(candidates[0].linkedin_data).toBeNull()
    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('linkedin-profile-empty')).toBeVisible()
    await expect(page.getByTestId('linkedin-connect-prompt')).toBeVisible()

    await app.close()
    cleanupUserData(userDataDir)
  })

  test('AC-3: expired session clears cookies and shows reconnect banner', async () => {
    const userDataDir = seedStore({
      linkedinConnected: true,
      linkedinCookies: [LINKEDIN_COOKIE]
    })
    const app = await launchApp(userDataDir, { linkedinFixture: 'login' })
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="candidates-view"]')
    acceptConfirmDialogs(page)

    await uploadAndParse(page)
    await page.getByTestId('view-detail-btn').first().click()
    await expect(page.getByTestId('linkedin-session-expired')).toBeVisible()

    const settings = await getSettings(page)
    expect(settings.linkedinConnected).toBe(false)

    await app.close()
    cleanupUserData(userDataDir)
  })
})
