import { afterEach, describe, expect, it } from 'vitest'

import {
  closeDatabase,
  getCandidateById,
  initDatabaseAtPath,
  insertCandidate
} from '../../src/main/db/database.js'

afterEach(() => {
  closeDatabase()
})

describe('database', () => {
  it('inserts a candidate and reads it back from an in-memory database', () => {
    initDatabaseAtPath(':memory:')

    const id = insertCandidate({
      fileName: 'sample-resume.pdf',
      rawText: 'Jane Doe, Civil Engineer',
      extractedFields: {
        summary_title: 'Civil Engineer at Acme',
        parsing_confidence: 'high'
      },
      aiProvider: 'gemini'
    })

    const row = getCandidateById(id)
    expect(row).not.toBeNull()
    expect(row.file_name).toBe('sample-resume.pdf')
    expect(row.raw_text).toBe('Jane Doe, Civil Engineer')
    expect(row.extracted_fields.summary_title).toBe('Civil Engineer at Acme')
    expect(row.ai_provider).toBe('gemini')
    expect(row.confidence_score).toBe('high')
  })
})
