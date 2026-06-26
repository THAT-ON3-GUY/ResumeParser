import { ipcMain, shell, app, BrowserWindow } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import store from './store.js'
import { getSettings, setSetting, disconnectLinkedIn } from './settings.js'
import {
  insertCandidate,
  getAllCandidates,
  getCandidateById,
  deleteCandidate,
  clearAllCandidates,
  updateCandidateSearchResults,
  updateCandidateLinkedInData,
  updateCandidatePublicRecords
} from './db/database.js'
import { readResumeText } from './parser/fileReader.js'
import { extractResume } from './parser/aiProvider.js'
import { searchDuckDuckGo } from './search/duckduckgo.js'
import { checkPublicSources } from './search/publicSources.js'
import {
  hasLinkedInSession,
  openLinkedInLogin,
  notifyLinkedInConnected,
  notifyLinkedInSessionExpired,
  scrapeLinkedInForCandidate
} from './search/linkedin.js'

function getMainWindow() {
  return BrowserWindow.getAllWindows().find((w) => {
    const url = w.webContents.getURL()
    return url.includes('index.html') || url.startsWith('file://')
  })
}

async function runSearchForCandidate(candidateId, extractedFields) {
  try {
    const searchResults = await searchDuckDuckGo(extractedFields)
    const linkedinHits = searchResults.results?.filter((r) => r.isLinkedIn) ?? []
    let linkedinData = null

    if (linkedinHits.length && !hasLinkedInSession()) {
      searchResults.linkedinConnectRequired = true
      console.log('[ipc] search: LinkedIn URLs found but session not connected')
      updateCandidateLinkedInData(candidateId, null)
    } else if (linkedinHits.length) {
      console.log('[ipc] search: checking LinkedIn profiles')
      const scrape = await scrapeLinkedInForCandidate(searchResults)
      linkedinData = scrape.linkedinData
      updateCandidateLinkedInData(candidateId, linkedinData)
      if (scrape.sessionExpired) {
        searchResults.linkedinSessionExpired = true
        notifyLinkedInSessionExpired(getMainWindow())
      }
    } else {
      updateCandidateLinkedInData(candidateId, null)
    }

    updateCandidateSearchResults(candidateId, searchResults)
    return { searchResults, linkedinData }
  } catch (err) {
    console.error('[ipc] search failed — storing empty results', err.message)
    const empty = {
      query: '',
      results: [],
      searchedAt: new Date().toISOString(),
      error: err.message
    }
    updateCandidateSearchResults(candidateId, empty)
    updateCandidateLinkedInData(candidateId, null)
    return { searchResults: empty, linkedinData: null }
  }
}

async function runPublicRecordsForCandidate(candidateId, extractedFields) {
  try {
    console.log('[ipc] public records check')
    const publicRecords = await checkPublicSources(extractedFields)
    updateCandidatePublicRecords(candidateId, publicRecords)
    return publicRecords
  } catch (err) {
    console.error('[ipc] public records failed', err.message)
    const empty = {
      sourcesChecked: [],
      results: {},
      notes: [],
      checkedAt: new Date().toISOString(),
      error: err.message
    }
    updateCandidatePublicRecords(candidateId, empty)
    return empty
  }
}

async function runEnrichmentForCandidate(candidateId, extractedFields) {
  const searchOutcome = await runSearchForCandidate(candidateId, extractedFields)
  const publicRecords = await runPublicRecordsForCandidate(candidateId, extractedFields)
  return { ...searchOutcome, publicRecords }
}

export function registerIpcHandlers() {
  ipcMain.handle('resume:read', async (_event, filePath) => {
    return readResumeText(filePath)
  })

  ipcMain.handle('resume:parse', async (_event, filePath) => {
    console.log('[ipc] resume:parse', filePath)
    const { text, fileName, charCount } = await readResumeText(filePath)
    const parsed = await extractResume(text)
    const aiProvider = store.get('aiProvider', 'gemini')
    const dbId = insertCandidate({
      fileName,
      rawText: text,
      extractedFields: parsed,
      aiProvider,
      confidenceScore: parsed?.parsing_confidence ?? null
    })
    console.log('[ipc] resume:parse saved db id', dbId)

    let searchResults = null
    let linkedinData = null
    let publicRecords = null
    if (store.get('autoSearchOnUpload', true)) {
      console.log('[ipc] resume:parse auto-search enabled')
      const outcome = await runEnrichmentForCandidate(dbId, parsed)
      searchResults = outcome.searchResults
      linkedinData = outcome.linkedinData
      publicRecords = outcome.publicRecords
    }

    return { id: dbId, fileName, charCount, parsed, searchResults, linkedinData, publicRecords }
  })

  ipcMain.handle('search:run', async (_event, candidateId) => {
    console.log('[ipc] search:run', candidateId)
    const candidate = getCandidateById(candidateId)
    if (!candidate) throw new Error(`Candidate not found: ${candidateId}`)
    return runEnrichmentForCandidate(candidateId, candidate.extracted_fields)
  })

  ipcMain.handle('db:get-all', async () => {
    console.log('[ipc] db:get-all')
    return getAllCandidates()
  })

  ipcMain.handle('db:delete', async (_event, id) => {
    console.log('[ipc] db:delete', id)
    deleteCandidate(id)
    return { ok: true }
  })

  ipcMain.handle('db:clear-all', async () => {
    console.log('[ipc] db:clear-all')
    clearAllCandidates()
    return { ok: true }
  })

  ipcMain.handle('settings:get', async () => {
    console.log('[ipc] settings:get')
    return getSettings()
  })

  ipcMain.handle('settings:set', async (_event, key, value) => {
    console.log('[ipc] settings:set', key)
    return setSetting(key, value)
  })

  ipcMain.handle('shell:open-external', async (_event, url) => {
    console.log('[ipc] shell:open-external', url)
    if (process.env.RESUME_INTEL_E2E === '1') {
      writeFileSync(join(app.getPath('userData'), 'e2e-last-external-url.txt'), String(url))
      return { ok: true }
    }
    await shell.openExternal(url)
    return { ok: true }
  })

  ipcMain.handle('linkedin:login', async (event) => {
    console.log('[ipc] linkedin:login')
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    const settings = await openLinkedInLogin(senderWindow)
    notifyLinkedInConnected(getMainWindow() ?? senderWindow, settings)
    return settings
  })

  ipcMain.handle('linkedin:status', async () => {
    console.log('[ipc] linkedin:status')
    return { connected: hasLinkedInSession(), settings: getSettings() }
  })

  ipcMain.handle('linkedin:disconnect', async () => {
    console.log('[ipc] linkedin:disconnect')
    return disconnectLinkedIn()
  })
}
