import { join } from 'node:path'

import { app } from 'electron'
import { chromium } from 'playwright'

/**
 * Point Playwright at bundled Chromium when running from a packaged installer.
 */
export function configurePlaywrightBrowsersPath() {
  if (!app.isPackaged) return
  const browsersPath = join(process.resourcesPath, 'browsers')
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath
  console.log('[playwright] using packaged browsers at', browsersPath)
}

/**
 * @param {import('playwright').LaunchOptions} [options]
 */
export async function launchChromium(options = {}) {
  return chromium.launch({ headless: true, ...options })
}
