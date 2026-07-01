import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, shell } from 'electron'
import XLSX from 'xlsx-js-style'

import { getAllCandidates, getCandidateById, getCandidatesByIds } from '../db/database.js'
import {
  CSV_HEADERS,
  TOP_LEVEL_FIELD_KEYS,
  candidateToCsvLine,
  collectSourceUrls,
  flattenCandidateFields
} from './exportFormat.js'

export {
  TOP_LEVEL_FIELD_KEYS,
  serializeFieldValue,
  flattenCandidateFields,
  collectSourceUrls
} from './exportFormat.js'

const CONFIDENCE_FILLS = {
  high: { fgColor: { rgb: 'FFC6EFCE' } },
  medium: { fgColor: { rgb: 'FFFFEB9C' } },
  low: { fgColor: { rgb: 'FFFFC7CE' } }
}

function resolveRecords(candidateIds) {
  if (candidateIds == null) return getAllCandidates()
  if (Array.isArray(candidateIds) && candidateIds.length === 0) return getAllCandidates()
  return getCandidatesByIds(candidateIds)
}

function exportFileName(ext) {
  const date = new Date().toISOString().slice(0, 10)
  return `resume-intel-export-${date}-${Date.now()}.${ext}`
}

function finishExport(outPath) {
  console.log('[export] Saved export', outPath)
  if (process.env.RESUME_INTEL_E2E === '1') {
    writeFileSync(join(app.getPath('userData'), 'e2e-last-export-path.txt'), outPath)
    return { ok: true, path: outPath }
  }
  shell.openPath(outPath)
  return { ok: true, path: outPath }
}

function confidenceStyle(score) {
  const key = String(score ?? 'low').toLowerCase()
  const fill = CONFIDENCE_FILLS[key] ?? CONFIDENCE_FILLS.low
  return { fill }
}

export async function exportCandidatesCsv(candidateIds) {
  const records = resolveRecords(candidateIds)
  if (!records.length) throw new Error('No candidates to export')

  const csv = `${CSV_HEADERS.join(',')}\n${records.map(candidateToCsvLine).join('\n')}\n`
  const outPath = join(app.getPath('downloads'), exportFileName('csv'))
  console.log('[export] Writing CSV', outPath, records.length, 'rows')
  writeFileSync(outPath, csv, 'utf8')
  return finishExport(outPath)
}

export async function exportCandidatesExcel(candidateIds) {
  const records = resolveRecords(candidateIds)
  if (!records.length) throw new Error('No candidates to export')

  const headers = CSV_HEADERS
  const dataRows = records.map((record) => headers.map((header) => flattenCandidateFields(record)[header]))

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  const confidenceCol = headers.indexOf('parsing_confidence')
  if (confidenceCol >= 0) {
    for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: confidenceCol })
      const score = records[rowIndex].extracted_fields?.parsing_confidence
      if (ws[cellRef]) {
        ws[cellRef].s = confidenceStyle(score)
      }
    }
  }

  const sourceRows = [['file_name', 'source_type', 'url', 'title']]
  for (const record of records) {
    for (const source of collectSourceUrls(record)) {
      sourceRows.push([source.file_name, source.source_type, source.url, source.title])
    }
  }
  const sourcesWs = XLSX.utils.aoa_to_sheet(sourceRows)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates')
  XLSX.utils.book_append_sheet(wb, sourcesWs, 'Sources')

  const outPath = join(app.getPath('downloads'), exportFileName('xlsx'))
  console.log('[export] Writing Excel', outPath, records.length, 'rows')
  XLSX.writeFile(wb, outPath, { cellStyles: true })
  return finishExport(outPath)
}

export async function exportCandidateRowCsv(candidateId) {
  const record = getCandidateById(candidateId)
  if (!record) throw new Error(`Candidate not found: ${candidateId}`)

  const csv = `${CSV_HEADERS.join(',')}\n${candidateToCsvLine(record)}\n`
  const base = record.file_name.replace(/\.[^.]+$/, '') || 'candidate'
  const fileName = `resume-intel-${base}-${Date.now()}.csv`
  const outPath = join(app.getPath('downloads'), fileName)

  console.log('[export] Writing row CSV', outPath)
  writeFileSync(outPath, csv, 'utf8')
  return finishExport(outPath)
}
