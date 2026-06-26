import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

export async function run() {
  const settingsJs = readFileSync(join(ROOT, 'src/main/settings.js'), 'utf8')
  const panelJsx = readFileSync(join(ROOT, 'src/renderer/src/components/SettingsPanel.jsx'), 'utf8')
  const ipc = readFileSync(join(ROOT, 'src/main/ipc-handlers.js'), 'utf8')

  for (const fn of ['getSettings', 'setSetting', 'disconnectLinkedIn']) {
    if (!settingsJs.includes(`export function ${fn}`)) {
      throw new Error(`settings.js missing ${fn}`)
    }
  }

  for (const key of ['aiProvider', 'geminiApiKey', 'claudeApiKey', 'searchDelaySeconds']) {
    if (!settingsJs.includes(key)) throw new Error(`settings.js missing key ${key}`)
  }

  if (!panelJsx.includes('Clear all data')) throw new Error('SettingsPanel missing Clear all data')
  if (!panelJsx.includes('aistudio.google.com')) throw new Error('SettingsPanel missing Gemini helper link')
  if (!panelJsx.includes('console.anthropic.com')) throw new Error('SettingsPanel missing Claude helper link')
  if (!panelJsx.includes('type={show ? \'text\' : \'password\'}')) {
    throw new Error('SettingsPanel missing password field toggle')
  }

  if (!ipc.includes('shell:open-external')) throw new Error('Missing shell:open-external IPC')

  return { ok: true, message: 'Settings module, panel, and IPC surface OK' }
}
