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
  return { ok: true, message: 'Truncated JSON repair parses successfully' }
}
