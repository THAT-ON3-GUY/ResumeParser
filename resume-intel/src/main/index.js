import dotenv from 'dotenv'
import { app, BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import store from './store.js'
import { initDatabase } from './db/database.js'
import { registerIpcHandlers } from './ipc-handlers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (process.env.RESUME_INTEL_E2E_USER_DATA) {
  app.setPath('userData', process.env.RESUME_INTEL_E2E_USER_DATA)
}

// Load project `.env` (next to package.json). Bundled main lives in `out/main`.
dotenv.config({ path: join(__dirname, '../../.env') })
dotenv.config()

/** Isolated E2E userData uses seeded config.json — do not overwrite from .env */
if (process.env.GEMINI_API_KEY && !process.env.RESUME_INTEL_E2E_USER_DATA) {
  store.set('geminiApiKey', process.env.GEMINI_API_KEY)
}

/** Preload artifact name varies: CJS is often `index.cjs` when package is ESM; dev may emit `index.js`. */
function getPreloadPath() {
  const dir = join(__dirname, '../preload')
  const candidates = [join(dir, 'index.cjs'), join(dir, 'index.js'), join(dir, 'index.mjs')]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[0]
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    title: 'Resume Intel',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
