import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import store from '../store.js'
import { EXTRACTION_PROMPT, SUMMARY_PROMPT } from './prompts.js'
import { parseGeminiJson } from './geminiParser.js'

export const CLAUDE_API_KEY_ERROR = 'Claude API key not set. Add it in Settings.'
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const REQUEST_TIMEOUT_MS = 15000
const RATE_LIMIT_RETRY_MS = 2000
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadE2EFixture() {
  const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
  if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
  const fileName =
    process.env.RESUME_INTEL_E2E_CLAUDE_FIXTURE ||
    process.env.RESUME_INTEL_E2E_GEMINI_FIXTURE ||
    'gemini-response.json'
  const raw = readFileSync(join(fixturesDir, fileName), 'utf8')
  return JSON.parse(raw)
}

function loadE2ESummaryFixture() {
  const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
  if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
  const fileName =
    process.env.RESUME_INTEL_E2E_CLAUDE_SUMMARY_FIXTURE ||
    process.env.RESUME_INTEL_E2E_SUMMARY_FIXTURE ||
    'gemini-summary-response.json'
  const raw = readFileSync(join(fixturesDir, fileName), 'utf8')
  return JSON.parse(raw)
}

async function callClaude(prompt) {
  const apiKey = store.get('claudeApiKey')
  if (!apiKey) {
    throw new Error(CLAUDE_API_KEY_ERROR)
  }

  const model = store.get('claudeModel', DEFAULT_CLAUDE_MODEL)
  const body = JSON.stringify({
    model,
    max_tokens: 4000,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }]
  })

  async function postOnce() {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    const data = await res.json()
    return { res, data }
  }

  console.log('[claudeParser] Calling Claude API')
  let { res, data } = await postOnce()

  if (res.status === 429) {
    console.log('[claudeParser] 429 rate limit — retrying once after 2s')
    await sleep(RATE_LIMIT_RETRY_MS)
    ;({ res, data } = await postOnce())
  }

  if (!res.ok) {
    const msg = data?.error?.message ?? JSON.stringify(data).slice(0, 300)
    throw new Error(`Claude API error (${res.status}): ${msg}`)
  }

  const raw = data.content?.[0]?.text ?? ''
  return raw.replace(/```json|```/g, '').trim()
}

export async function extractWithClaude(resumeText) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    console.log('[claudeParser] E2E fixture mode — skipping network')
    return loadE2EFixture()
  }
  const raw = await callClaude(EXTRACTION_PROMPT + resumeText)
  try {
    return parseGeminiJson(raw)
  } catch {
    throw new Error('Claude returned invalid JSON. Raw response: ' + raw.slice(0, 300))
  }
}

export async function summarizeWithClaude(data) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    console.log('[claudeParser] E2E summary fixture mode — skipping network')
    return loadE2ESummaryFixture()
  }
  const payload = JSON.stringify(data ?? {}, null, 2)
  const raw = await callClaude(SUMMARY_PROMPT + payload)
  try {
    return parseGeminiJson(raw)
  } catch {
    throw new Error('Claude summary returned invalid JSON. Raw response: ' + raw.slice(0, 300))
  }
}
