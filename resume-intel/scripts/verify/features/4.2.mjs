import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

export async function run() {
  const source = readFileSync(join(ROOT, 'src/main/search/linkedin.js'), 'utf8')
  for (const name of [
    'openLinkedInLogin',
    'hasLinkedInSession',
    'clearLinkedInSession',
    'notifyLinkedInConnected',
    'requireLinkedInSessionForScrape',
    'simulateLinkedInLoginForE2E'
  ]) {
    if (!source.includes(`export function ${name}`)) {
      throw new Error(`linkedin.js missing export: ${name}`)
    }
  }

  if (!source.includes('linkedinCookies') || source.includes('linkedinPassword')) {
    throw new Error('linkedin.js must store cookies only, not credentials')
  }

  const ipc = readFileSync(join(ROOT, 'src/main/ipc-handlers.js'), 'utf8')
  for (const ch of ['linkedin:login', 'linkedin:status', 'linkedin:disconnect']) {
    if (!ipc.includes(`'${ch}'`)) throw new Error(`missing ${ch} IPC`)
  }

  if (!ipc.includes('linkedinConnectRequired')) {
    throw new Error('search pipeline must set linkedinConnectRequired when session missing')
  }

  const panel = readFileSync(join(ROOT, 'src/renderer/src/components/SettingsPanel.jsx'), 'utf8')
  if (!panel.includes('settings-linkedin-connect')) {
    throw new Error('SettingsPanel missing Connect LinkedIn control')
  }

  const settingsSource = readFileSync(join(ROOT, 'src/main/settings.js'), 'utf8')
  if (settingsSource.includes('linkedinPassword') || settingsSource.includes('linkedinUsername')) {
    throw new Error('settings must not store LinkedIn credentials')
  }

  return { ok: true, message: 'LinkedIn login module, IPC, Settings UI, and cookie-only storage OK' }
}
