import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/main/store.js', () => ({
  default: {
    get: vi.fn()
  }
}))

import { summarizeWithGemini } from '../../src/main/parser/geminiParser.js'
import { SUMMARY_PROMPT } from '../../src/main/parser/prompts.js'
import store from '../../src/main/store.js'

describe('SUMMARY_PROMPT', () => {
  it('lists all required summary JSON keys', () => {
    for (const key of [
      'summary',
      'match_confidence',
      'best_outreach_method',
      'contact_hints',
      'discrepancies',
      'recommended_search_queries'
    ]) {
      expect(SUMMARY_PROMPT).toContain(`"${key}"`)
    }
  })
})

describe('summarizeWithGemini', () => {
  beforeEach(() => {
    delete process.env.RESUME_INTEL_E2E
    delete process.env.RESUME_INTEL_E2E_FIXTURES
    delete process.env.RESUME_INTEL_E2E_SUMMARY_FIXTURE
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('calls Gemini with bundled findings and parses JSON summary', async () => {
    store.get.mockImplementation((key) => {
      if (key === 'geminiApiKey') return 'test-api-key'
      if (key === 'geminiModel') return 'gemini-2.5-flash'
      return undefined
    })

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"summary":"Good match","match_confidence":"high","best_outreach_method":"Email","contact_hints":[],"discrepancies":[],"recommended_search_queries":[]}'
                }
              ]
            }
          }
        ]
      })
    })

    const result = await summarizeWithGemini({
      extracted_fields: { summary_title: 'Engineer' },
      search_results: { results: [] }
    })

    expect(fetch).toHaveBeenCalledOnce()
    expect(result.summary).toBe('Good match')
    expect(result.match_confidence).toBe('high')
  })
})
