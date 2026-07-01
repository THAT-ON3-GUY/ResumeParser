import { describe, expect, it } from 'vitest'

import {
  CSV_HEADERS,
  TOP_LEVEL_FIELD_KEYS,
  collectSourceUrls,
  flattenCandidateFields
} from '../../src/main/export/exportFormat.js'

describe('exportFormat', () => {
  it('includes one CSV column per extracted top-level field', () => {
    expect(CSV_HEADERS).toEqual(['file_name', ...TOP_LEVEL_FIELD_KEYS])
  })

  it('flattens structured extracted fields for CSV rows', () => {
    const flat = flattenCandidateFields({
      file_name: 'resume.pdf',
      extracted_fields: {
        summary_title: 'Engineer at Acme',
        skills: ['React', 'Node'],
        parsing_confidence: 'high'
      }
    })
    expect(flat.summary_title).toBe('Engineer at Acme')
    expect(flat.skills).toBe('React; Node')
    expect(flat.parsing_confidence).toBe('high')
  })

  it('collects search and LinkedIn URLs for the Sources sheet', () => {
    const sources = collectSourceUrls({
      file_name: 'resume.pdf',
      search_results: {
        results: [{ url: 'https://linkedin.com/in/test', isLinkedIn: true, title: 'Profile' }]
      },
      linkedin_data: { profileUrl: 'https://linkedin.com/in/test', name: 'Test User' }
    })
    expect(sources.length).toBeGreaterThanOrEqual(2)
    expect(sources.some((row) => row.source_type === 'linkedin_search')).toBe(true)
  })
})
