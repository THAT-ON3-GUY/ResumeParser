import store from './store.js'
import { clearLinkedInSession } from './search/linkedin.js'

export const SETTINGS_KEYS = [
  'aiProvider',
  'geminiApiKey',
  'geminiModel',
  'claudeApiKey',
  'googleSearchApiKey',
  'googleCxId',
  'linkedinConnected',
  'searchDelaySeconds',
  'autoSearchOnUpload',
  'defaultExportFormat'
]

const DEFAULTS = {
  aiProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  claudeApiKey: '',
  googleSearchApiKey: '',
  googleCxId: '',
  linkedinConnected: false,
  searchDelaySeconds: 7,
  autoSearchOnUpload: true,
  defaultExportFormat: 'csv'
}

export function getSettings() {
  const out = {}
  for (const key of SETTINGS_KEYS) {
    out[key] = store.get(key, DEFAULTS[key])
  }
  return out
}

export function setSetting(key, value) {
  if (!SETTINGS_KEYS.includes(key)) {
    throw new Error(`Unknown setting: ${key}`)
  }
  console.log('[settings] set', key)
  store.set(key, value)
  return getSettings()
}

export function disconnectLinkedIn() {
  clearLinkedInSession()
  console.log('[settings] LinkedIn disconnected')
  return getSettings()
}
