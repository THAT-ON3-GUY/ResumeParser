import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/main/store.js', () => ({
  default: {
    get: vi.fn()
  }
}))

import store from '../../src/main/store.js'
import { extractWithGemini, parseGeminiJson, repairTruncatedJson } from '../../src/main/parser/geminiParser.js'

describe('parseGeminiJson', () => {
  it('strips markdown fences before parsing JSON', () => {
    const parsed = parseGeminiJson('```json\n{"summary_title":"Engineer"}\n```')
    expect(parsed.summary_title).toBe('Engineer')
  })
})

describe('repairTruncatedJson', () => {
  it('repairs truncated JSON objects', () => {
    const repaired = repairTruncatedJson('{"summary_title":"Engineer","skills":["cad"')
    const parsed = JSON.parse(repaired)
    expect(parsed.summary_title).toBe('Engineer')
    expect(parsed.skills).toEqual(['cad'])
  })
})

describe('extractWithGemini', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('throws when the Gemini API key is missing', async () => {
    store.get.mockImplementation((key) => (key === 'geminiModel' ? 'gemini-2.5-flash' : ''))

    await expect(extractWithGemini('resume text')).rejects.toThrow(/Gemini API key not set/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls Gemini and parses fenced JSON from the response', async () => {
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
              parts: [{ text: '```json\n{"summary_title":"Civil Engineer","parsing_confidence":"high"}\n```' }]
            }
          }
        ]
      })
    })

    const result = await extractWithGemini('resume body')
    expect(fetch).toHaveBeenCalledOnce()
    expect(result.summary_title).toBe('Civil Engineer')
    expect(result.parsing_confidence).toBe('high')
  })
})
