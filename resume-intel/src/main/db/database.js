import { join } from 'node:path'

import Database from 'better-sqlite3'
import { app } from 'electron'

/** @typedef {object} CandidateRecord
 * @property {number} id
 * @property {string} file_name
 * @property {string|null} raw_text
 * @property {object|null} extracted_fields
 * @property {object|null} search_results
 * @property {object|null} linkedin_data
 * @property {object|null} public_records
 * @property {object|null} ai_summary
 * @property {string|null} ai_provider
 * @property {string|null} confidence_score
 * @property {string} created_at
 */

let db = null

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  raw_text TEXT,
  extracted_fields TEXT,
  search_results TEXT,
  linkedin_data TEXT,
  public_records TEXT,
  ai_summary TEXT,
  ai_provider TEXT,
  confidence_score TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

function parseJsonColumn(value) {
  if (value == null || value === '') return null
  try {
    return JSON.parse(value)
  } catch {
    console.warn('[database] Failed to parse JSON column:', String(value).slice(0, 80))
    return null
  }
}

function rowToRecord(row) {
  if (!row) return null
  return {
    id: row.id,
    file_name: row.file_name,
    raw_text: row.raw_text,
    extracted_fields: parseJsonColumn(row.extracted_fields),
    search_results: parseJsonColumn(row.search_results),
    linkedin_data: parseJsonColumn(row.linkedin_data),
    public_records: parseJsonColumn(row.public_records),
    ai_summary: parseJsonColumn(row.ai_summary),
    ai_provider: row.ai_provider,
    confidence_score: row.confidence_score,
    created_at: row.created_at
  }
}

export function initDatabaseAtPath(dbPath) {
  if (db) {
    db.close()
    db = null
  }

  console.log('[database] Opening SQLite at', dbPath)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(CREATE_TABLE_SQL)
  console.log('[database] Schema ready')
  return db
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

export function initDatabase() {
  if (db) return db
  const dbPath = join(app.getPath('userData'), 'resume-intel.db')
  return initDatabaseAtPath(dbPath)
}

export function getDatabase() {
  if (!db) throw new Error('Database not initialized — call initDatabase() first')
  return db
}

/**
 * @param {object} candidate
 * @param {string} candidate.fileName
 * @param {string} [candidate.rawText]
 * @param {object} candidate.extractedFields
 * @param {string} [candidate.aiProvider]
 * @param {string|null} [candidate.confidenceScore]
 * @returns {number}
 */
export function insertCandidate({ fileName, rawText, extractedFields, aiProvider, confidenceScore }) {
  console.log('[database] insertCandidate', fileName)

  const stmt = getDatabase().prepare(`
    INSERT INTO candidates (
      file_name, raw_text, extracted_fields, ai_provider, confidence_score
    ) VALUES (?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    fileName,
    rawText ?? null,
    JSON.stringify(extractedFields ?? {}),
    aiProvider ?? null,
    confidenceScore ?? extractedFields?.parsing_confidence ?? null
  )

  return Number(result.lastInsertRowid)
}

/** @returns {CandidateRecord[]} */
export function getAllCandidates() {
  const rows = getDatabase()
    .prepare('SELECT * FROM candidates ORDER BY created_at DESC, id DESC')
    .all()
  return rows.map(rowToRecord)
}

/** @returns {CandidateRecord|null} */
export function getCandidateById(id) {
  const row = getDatabase().prepare('SELECT * FROM candidates WHERE id = ?').get(id)
  return rowToRecord(row)
}

/** @returns {CandidateRecord[]} */
export function getCandidatesByIds(ids) {
  if (!ids?.length) return []
  const placeholders = ids.map(() => '?').join(', ')
  const rows = getDatabase()
    .prepare(`SELECT * FROM candidates WHERE id IN (${placeholders}) ORDER BY created_at DESC, id DESC`)
    .all(...ids)
  return rows.map(rowToRecord)
}

export function deleteCandidate(id) {
  console.log('[database] deleteCandidate', id)
  getDatabase().prepare('DELETE FROM candidates WHERE id = ?').run(id)
}

export function clearAllCandidates() {
  console.log('[database] clearAllCandidates')
  getDatabase().prepare('DELETE FROM candidates').run()
}

/**
 * @param {number} id
 * @param {object|null} searchResults
 */
export function updateCandidateSearchResults(id, searchResults) {
  console.log('[database] updateCandidateSearchResults', id)
  getDatabase()
    .prepare('UPDATE candidates SET search_results = ? WHERE id = ?')
    .run(JSON.stringify(searchResults ?? { results: [] }), id)
}

/**
 * @param {number} id
 * @param {object|null} linkedinData
 */
export function updateCandidateLinkedInData(id, linkedinData) {
  console.log('[database] updateCandidateLinkedInData', id)
  getDatabase()
    .prepare('UPDATE candidates SET linkedin_data = ? WHERE id = ?')
    .run(linkedinData ? JSON.stringify(linkedinData) : null, id)
}

/**
 * @param {number} id
 * @param {object|null} publicRecords
 */
export function updateCandidatePublicRecords(id, publicRecords) {
  console.log('[database] updateCandidatePublicRecords', id)
  getDatabase()
    .prepare('UPDATE candidates SET public_records = ? WHERE id = ?')
    .run(publicRecords ? JSON.stringify(publicRecords) : null, id)
}

/**
 * @param {number} id
 * @param {object|null} aiSummary
 * @param {string|null} [aiProvider]
 */
export function updateCandidateAiSummary(id, aiSummary, aiProvider) {
  console.log('[database] updateCandidateAiSummary', id)
  getDatabase()
    .prepare('UPDATE candidates SET ai_summary = ?, ai_provider = ? WHERE id = ?')
    .run(JSON.stringify(aiSummary ?? {}), aiProvider ?? null, id)
}
