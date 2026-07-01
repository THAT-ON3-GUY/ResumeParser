import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EXTRACTION_PROMPT } from '../../../src/main/parser/prompts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')
const API_KEY_ERROR = 'Gemini API key not set. Add it in Settings.'

/** Mirrors repairTruncatedJson logic for unit verification without Electron imports. */
function repairTruncatedJson(text) {
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
      if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') stack.push('{')
    else if (c === '[') stack.push('[')
    else if (c === '}' && stack.at(-1) === '{') stack.pop()
    else if (c === ']' && stack.at(-1) === '[') stack.pop()
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

export async function run() {
  const truncated = '{"skills":["JavaScript","Python","Go'
  const repaired = repairTruncatedJson(truncated)
  const parsed = JSON.parse(repaired)
  if (!Array.isArray(parsed.skills) || parsed.skills.length !== 3) {
    throw new Error('Truncated JSON repair did not produce valid skills array')
  }

  for (const token of ['source_quote', 'confidence']) {
    if (!EXTRACTION_PROMPT.includes(`"${token}"`)) {
      throw new Error(`EXTRACTION_PROMPT missing ${token}`)
    }
  }

  const parserSrc = readFileSync(join(ROOT, 'src/main/parser/geminiParser.js'), 'utf8')
  if (!parserSrc.includes(API_KEY_ERROR)) {
    throw new Error('geminiParser.js missing canonical API key error message')
  }
  if (!parserSrc.includes('429') || !parserSrc.includes('2000')) {
    throw new Error('geminiParser.js missing 429 retry with 2s delay')
  }
  if (!parserSrc.includes('slice(0, 300)')) {
    throw new Error('geminiParser.js missing 300-char JSON error snippet')
  }

  const fixture = JSON.parse(
    readFileSync(join(ROOT, 'scripts/verify/fixtures/gemini-response-pe.json'), 'utf8')
  )
  const pe = fixture.licenses_certifications?.[0]
  if (pe?.name !== 'PE License' || !pe?.source_quote) {
    throw new Error('gemini-response-pe.json missing PE License with source_quote')
  }

  return { ok: true, message: 'Prompt, parser guards, JSON repair, and PE fixture validated' }
}
