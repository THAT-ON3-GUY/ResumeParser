import { EXTRACTION_PROMPT } from './prompts.js'
import store from '../store.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

function parseGeminiJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const repaired = repairTruncatedJson(cleaned)
    return JSON.parse(repaired)
  }
}

function buildGeminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

function loadE2EFixture() {
  const fixturesDir = process.env.RESUME_INTEL_E2E_FIXTURES
  if (!fixturesDir) throw new Error('RESUME_INTEL_E2E_FIXTURES not set')
  const raw = readFileSync(join(fixturesDir, 'gemini-response.json'), 'utf8')
  return JSON.parse(raw)
}

async function callGemini(prompt) {
  const apiKey = store.get('geminiApiKey')
  if (!apiKey) {
    throw new Error(
      'Gemini API key not set. Set GEMINI_API_KEY in your environment for Milestone 1, or add a key in Settings (later).'
    )
  }

  const model = store.get('geminiModel', 'gemini-2.5-flash')
  const url = `${buildGeminiUrl(model)}?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4000
      }
    })
  })

  const data = await res.json()

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
    throw new Error('Gemini returned invalid JSON. Raw response: ' + raw.slice(0, 200))
  }
}

export async function summarizeWithGemini() {
  throw new Error('summarizeWithGemini not implemented in milestone 1')
}
