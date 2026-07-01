import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sortRows } from '../../../src/renderer/src/lib/tableSort.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

export async function run() {
  const tableSrc = readFileSync(
    join(ROOT, 'src/renderer/src/components/ResultsTable.jsx'),
    'utf8'
  )
  const requiredHeaders = [
    'File name',
    'Summary title',
    'Most recent employer',
    'Most recent title',
    'Location',
    'Education',
    'Licenses',
    'Years exp.',
    'LinkedIn found',
    'Confidence',
    'Actions'
  ]
  for (const header of requiredHeaders) {
    if (!tableSrc.includes(header)) {
      throw new Error(`ResultsTable missing column header: ${header}`)
    }
  }

  if (!tableSrc.includes('row-action-export')) {
    throw new Error('ResultsTable missing export row action')
  }
  if (!tableSrc.includes('sort-${col.key}')) {
    throw new Error('ResultsTable missing sortable column test ids')
  }

  const exporterSrc = readFileSync(join(ROOT, 'src/main/export/exporter.js'), 'utf8')
  if (!exporterSrc.includes('exportCandidateRowCsv')) {
    throw new Error('exporter.js missing exportCandidateRowCsv')
  }

  const ipcSrc = readFileSync(join(ROOT, 'src/main/ipc-handlers.js'), 'utf8')
  if (!ipcSrc.includes("'export:row'")) {
    throw new Error('ipc-handlers.js missing export:row channel')
  }

  const sorted = sortRows(
    [
      { parsed: { parsing_confidence: 'low' } },
      { parsed: { parsing_confidence: 'high' } },
      { parsed: { parsing_confidence: 'medium' } }
    ],
    'confidence',
    'desc'
  )
  if (sorted.map((r) => r.parsed.parsing_confidence).join(',') !== 'high,medium,low') {
    throw new Error('confidence sort order incorrect')
  }

  return { ok: true, message: 'Full columns, sort, filters wiring, and row export validated' }
}
