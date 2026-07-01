import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/main/store.js', () => ({
  default: {
    get: vi.fn()
  }
}))

import {
  CLAUDE_API_KEY_ERROR,
  DEFAULT_CLAUDE_MODEL,
  extractWithClaude
} from '../../src/main/parser/claudeParser.js'
import store from '../../src/main/store.js'

describe('extractWithClaude', () => {
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

  it('throws the canonical error when the Claude API key is missing', async () => {
    store.get.mockImplementation((key) => (key === 'claudeModel' ? DEFAULT_CLAUDE_MODEL : ''))

    await expect(extractWithClaude('resume text')).rejects.toThrow(CLAUDE_API_KEY_ERROR)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls Claude and parses fenced JSON from the response', async () => {
    store.get.mockImplementation((key) => {
      if (key === 'claudeApiKey') return 'test-api-key'
      if (key === 'claudeModel') return DEFAULT_CLAUDE_MODEL
      return undefined
    })

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            text: '```json\n{"summary_title":"Civil Engineer","parsing_confidence":"high"}\n```'
          }
        ]
      })
    })

    const result = await extractWithClaude('resume body')
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages')
    expect(result.summary_title).toBe('Civil Engineer')
    expect(result.parsing_confidence).toBe('high')
  })

  it('retries once after a 429 rate limit response', async () => {
    vi.useFakeTimers()
    store.get.mockImplementation((key) => {
      if (key === 'claudeApiKey') return 'test-api-key'
      if (key === 'claudeModel') return DEFAULT_CLAUDE_MODEL
      return undefined
    })

    fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limited' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: '{"summary_title":"Engineer","parsing_confidence":"high"}' }]
        })
      })

    const promise = extractWithClaude('resume body')
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.summary_title).toBe('Engineer')
  })
})
