import { describe, expect, it } from 'vitest'

import { CONFIDENCE_RANK, hasLinkedInFound, sortRows } from '../../src/renderer/src/lib/tableSort.js'

const row = (overrides) => ({
  id: '1',
  fileName: 'a.pdf',
  parsed: { parsing_confidence: 'high', summary_title: 'Engineer' },
  linkedinData: null,
  searchResults: null,
  ...overrides
})

describe('sortRows', () => {
  it('orders confidence high → medium → low when sorted descending', () => {
    const rows = [
      row({ id: '1', parsed: { parsing_confidence: 'low' } }),
      row({ id: '2', parsed: { parsing_confidence: 'high' } }),
      row({ id: '3', parsed: { parsing_confidence: 'medium' } })
    ]
    const sorted = sortRows(rows, 'confidence', 'desc')
    expect(sorted.map((r) => r.parsed.parsing_confidence)).toEqual(['high', 'medium', 'low'])
  })

  it('ranks confidence values consistently', () => {
    expect(CONFIDENCE_RANK.high).toBeGreaterThan(CONFIDENCE_RANK.medium)
    expect(CONFIDENCE_RANK.medium).toBeGreaterThan(CONFIDENCE_RANK.low)
  })
})

describe('hasLinkedInFound', () => {
  it('detects LinkedIn URLs in search results', () => {
    expect(
      hasLinkedInFound({
        linkedinData: null,
        searchResults: {
          results: [{ url: 'https://linkedin.com/in/jane', isLinkedIn: true }]
        }
      })
    ).toBe(true)
  })
})
