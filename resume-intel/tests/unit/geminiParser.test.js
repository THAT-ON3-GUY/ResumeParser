import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/main/store.js', () => ({
  default: {
    get: vi.fn()
  }
}))

import {
  extractWithGemini,
  GEMINI_API_KEY_ERROR,
  parseGeminiJson,
  repairTruncatedJson
} from '../../src/main/parser/geminiParser.js'
import store from '../../src/main/store.js'

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
    delete process.env.RESUME_INTEL_E2E
    delete process.env.RESUME_INTEL_E2E_FIXTURES
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('throws the canonical error when the Gemini API key is missing', async () => {
    store.get.mockImplementation((key) => (key === 'geminiModel' ? 'gemini-2.5-flash' : ''))

    await expect(extractWithGemini('resume text')).rejects.toThrow(GEMINI_API_KEY_ERROR)
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

  it('retries once after a 429 rate limit response', async () => {
    vi.useFakeTimers()
    store.get.mockImplementation((key) => {
      if (key === 'geminiApiKey') return 'test-api-key'
      if (key === 'geminiModel') return 'gemini-2.5-flash'
      return undefined
    })

    fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Resource exhausted' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{"summary_title":"Engineer","parsing_confidence":"high"}' }]
              }
            }
          ]
        })
      })

    const promise = extractWithGemini('resume body')
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.summary_title).toBe('Engineer')
  })

  it('includes the first 300 chars of raw text when JSON parsing fails', async () => {
    store.get.mockImplementation((key) => {
      if (key === 'geminiApiKey') return 'test-api-key'
      if (key === 'geminiModel') return 'gemini-2.5-flash'
      return undefined
    })

    const badJson = 'not-json-at-all-' + 'x'.repeat(400)
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: badJson }] } }]
      })
    })

    await expect(extractWithGemini('resume body')).rejects.toThrow(
      'Gemini returned invalid JSON. Raw response: ' + badJson.slice(0, 300)
    )
  })
})
