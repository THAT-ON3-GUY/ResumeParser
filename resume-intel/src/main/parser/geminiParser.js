import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import store from '../store.js'

import { EXTRACTION_PROMPT, SUMMARY_PROMPT } from './prompts.js'

export const GEMINI_API_KEY_ERROR = 'Gemini API key not set. Add it in Settings.'

const REQUEST_TIMEOUT_MS = 15000
const RATE_LIMIT_RETRY_MS = 2000

/**
 * Best-effort repair when Gemini output is cut off at maxOutputTokens mid-JSON.
 * Closes an open string, strips a trailing comma, then closes remaining `[` / `{` from a stack.
 */
export function repairTruncatedJson(text) {
  let s = String(text).trim().replace(/```json|```/g, '').trim()
  if (!s) return s

  const stack = []
  let inString = false
  let escape = false

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (c === '\\') {
        escape = true
      } else if (c === '"') {
        inString = false
      }
      continue
    }

    if (c === '"') {
      inString = true
      continue
    }

    if (c === '{') {
      stack.push('{')
    } else if (c === '[') {
      stack.push('[')
    } else if (c === '}') {
      if (stack.length && stack[stack.length - 1] === '{') stack.pop()
    } else if (c === ']') {
      if (stack.length && stack[stack.length - 1] === '[') stack.pop()
    }
  }

  let repaired = s
  if (inString) repaired += '"'

  repaired = repaired.replace(/,\s*$/, '')

  while (stack.length) {
    const top = stack.pop()
    repaired += top === '{' ? '}' : ']'
  }

  return repaired
}

export function parseGeminiJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const repaired = repairTruncatedJson(cleaned)
    return JSON.parse(repaired)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildGeminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

function loadE2EFixture() {
  const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
  if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
  const fileName = process.env.RESUME_INTEL_E2E_GEMINI_FIXTURE || 'gemini-response.json'
  const raw = readFileSync(join(fixturesDir, fileName), 'utf8')
  return JSON.parse(raw)
}

function loadE2ESummaryFixture() {
  const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
  if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
  const fileName = process.env.RESUME_INTEL_E2E_SUMMARY_FIXTURE || 'gemini-summary-response.json'
  const raw = readFileSync(join(fixturesDir, fileName), 'utf8')
  return JSON.parse(raw)
}

async function callGemini(prompt) {
  const apiKey = store.get('geminiApiKey')
  if (!apiKey) {
    throw new Error(GEMINI_API_KEY_ERROR)
  }

  const model = store.get('geminiModel', 'gemini-2.5-flash')
  const url = `${buildGeminiUrl(model)}?key=${encodeURIComponent(apiKey)}`

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4000
    }
  })

  async function postOnce() {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    const data = await res.json()
    return { res, data }
  }

  console.log('[geminiParser] Calling Gemini API')
  let { res, data } = await postOnce()

  if (res.status === 429) {
    console.log('[geminiParser] 429 rate limit — retrying once after 2s')
    await sleep(RATE_LIMIT_RETRY_MS)
    ;({ res, data } = await postOnce())
  }

  if (!res.ok) {
    const msg = data?.error?.message ?? JSON.stringify(data).slice(0, 300)
    throw new Error(`Gemini API error (${res.status}): ${msg}`)
  }

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return raw.replace(/```json|```/g, '').trim()
}

export async function extractWithGemini(resumeText) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    console.log('[geminiParser] E2E fixture mode — skipping network')
    return loadE2EFixture()
  }
  const raw = await callGemini(EXTRACTION_PROMPT + resumeText)
  try {
    return parseGeminiJson(raw)
  } catch {
    throw new Error('Gemini returned invalid JSON. Raw response: ' + raw.slice(0, 300))
  }
}

export async function summarizeWithGemini(data) {
  if (process.env.RESUME_INTEL_E2E === '1') {
    console.log('[geminiParser] E2E summary fixture mode — skipping network')
    return loadE2ESummaryFixture()
  }
  const payload = JSON.stringify(data ?? {}, null, 2)
  const raw = await callGemini(SUMMARY_PROMPT + payload)
  try {
    return parseGeminiJson(raw)
  } catch {
    throw new Error('Gemini summary returned invalid JSON. Raw response: ' + raw.slice(0, 300))
  }
}
