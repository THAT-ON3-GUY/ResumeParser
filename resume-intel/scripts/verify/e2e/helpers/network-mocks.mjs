import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { FIXTURES_DIR } from './electron-app.mjs'

/**
 * Supplementary Playwright network mocks for renderer-initiated requests.
 * Main-process Gemini and DuckDuckGo calls are mocked via RESUME_INTEL_E2E=1.
 */
export async function setupNetworkMocks(page) {
  const geminiFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'gemini-response.json'), 'utf8'))
  const ddgHtml = readFileSync(join(FIXTURES_DIR, 'ddg-results.html'), 'utf8')

  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(geminiFixture) }]
            }
          }
        ]
      })
    })
  })

  await page.route('**/duckduckgo.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=UTF-8',
      body: ddgHtml
    })
  })
}
