/** Normalize legacy parser output (previous_employers) with new shape. */
export function getCurrentEmployer(parsed) {
  if (!parsed || typeof parsed !== 'object') return null
  if (parsed.current_or_most_recent_employer) return parsed.current_or_most_recent_employer
  const list = getAllEmployers(parsed)
  return list[0] ?? null
}

export function getAllEmployers(parsed) {
  if (!parsed || typeof parsed !== 'object') return []
  if (Array.isArray(parsed.all_employers) && parsed.all_employers.length > 0) {
    return parsed.all_employers
  }
  if (Array.isArray(parsed.previous_employers) && parsed.previous_employers.length > 0) {
    return parsed.previous_employers
  }
  return Array.isArray(parsed.all_employers) ? parsed.all_employers : []
}

export function formatYearRange(start, end) {
  const s = start != null ? String(start) : '?'
  const e = end != null ? String(end) : 'present'
  return `${s}–${e}`
}

export function joinList(arr, sep = ', ') {
  if (!Array.isArray(arr) || !arr.length) return ''
  return arr.filter(Boolean).join(sep)
}
