import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CSV_HEADERS, TOP_LEVEL_FIELD_KEYS } from '../../../src/main/export/exportFormat.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

export async function run() {
  const exporterSrc = readFileSync(join(ROOT, 'src/main/export/exporter.js'), 'utf8')
  if (!exporterSrc.includes("from 'xlsx-js-style'") && !exporterSrc.includes('from "xlsx-js-style"')) {
    throw new Error('exporter.js must use xlsx in the main process')
  }
  if (!exporterSrc.includes('exportCandidatesCsv')) {
    throw new Error('exporter.js missing exportCandidatesCsv')
  }
  if (!exporterSrc.includes('exportCandidatesExcel')) {
    throw new Error('exporter.js missing exportCandidatesExcel')
  }
  if (!exporterSrc.includes("book_append_sheet(wb, sourcesWs, 'Sources')")) {
    throw new Error('Excel export missing Sources sheet')
  }
  if (!exporterSrc.includes('CONFIDENCE_FILLS')) {
    throw new Error('Excel export missing confidence color styling')
  }

  const barSrc = readFileSync(join(ROOT, 'src/renderer/src/components/ExportBar.jsx'), 'utf8')
  if (!barSrc.includes('data-testid="export-all-csv"')) {
    throw new Error('ExportBar missing Export CSV option')
  }
  if (!barSrc.includes('data-testid="export-all-excel"')) {
    throw new Error('ExportBar missing Export Excel option')
  }
  if (!barSrc.includes('export-selected-csv')) {
    throw new Error('ExportBar missing selected export controls')
  }

  const ipcSrc = readFileSync(join(ROOT, 'src/main/ipc-handlers.js'), 'utf8')
  if (!ipcSrc.includes("'export:csv'") || !ipcSrc.includes("'export:excel'")) {
    throw new Error('ipc-handlers.js missing bulk export channels')
  }

  const dbSrc = readFileSync(join(ROOT, 'src/main/db/database.js'), 'utf8')
  if (!dbSrc.includes('getCandidatesByIds')) {
    throw new Error('database.js missing getCandidatesByIds')
  }

  if (CSV_HEADERS.length !== TOP_LEVEL_FIELD_KEYS.length + 1) {
    throw new Error('CSV headers must include file_name plus each top-level extracted field')
  }

  return { ok: true, message: 'CSV/Excel export, ExportBar UI, IPC, and DB helpers validated' }
}
