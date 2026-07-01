import { getCurrentEmployer } from './parsedResume.js'

export const CONFIDENCE_RANK = {
  high: 3,
  medium: 2,
  low: 1,
  insufficient_data: 0
}

export function educationSummary(edu) {
  if (!Array.isArray(edu) || !edu.length) return '—'
  const e = edu[0]
  const parts = [e.degree, e.field].filter(Boolean).join(', ')
  const school = e.school || '—'
  const yr = e.graduation_year != null ? ` (${e.graduation_year})` : ''
  return `${parts ? `${parts} @ ` : ''}${school}${yr}`
}

export function locationSummary(locationHints) {
  if (!Array.isArray(locationHints) || !locationHints.length) return '—'
  return locationHints.filter(Boolean).join(', ')
}

export function firstLicense(licenses) {
  if (!Array.isArray(licenses) || !licenses.length) return null
  const item = licenses[0]
  if (typeof item === 'string') return item
  return item?.name || null
}

export function hasLinkedInFound(row) {
  if (row.linkedinData) return true
  return row.searchResults?.results?.some((hit) => hit.isLinkedIn) ?? false
}

export function hasLicense(row) {
  return Boolean(firstLicense(row.parsed?.licenses_certifications))
}

export function sortValue(row, key) {
  const p = row.parsed
  const cur = p ? getCurrentEmployer(p) : null
  switch (key) {
    case 'fileName':
      return row.fileName ?? ''
    case 'summaryTitle':
      return p?.summary_title ?? ''
    case 'employer':
      return cur?.company ?? ''
    case 'title':
      return cur?.title ?? ''
    case 'location':
      return locationSummary(p?.location_hints)
    case 'education':
      return educationSummary(p?.education)
    case 'license':
      return firstLicense(p?.licenses_certifications) ?? ''
    case 'years':
      return p?.years_experience ?? -1
    case 'linkedin':
      return hasLinkedInFound(row) ? 1 : 0
    case 'confidence':
      return CONFIDENCE_RANK[String(p?.parsing_confidence ?? 'low').toLowerCase()] ?? 0
    default:
      return ''
  }
}

export function sortRows(rows, sortKey, sortDir) {
  const list = [...rows]
  list.sort((a, b) => {
    const av = sortValue(a, sortKey)
    const bv = sortValue(b, sortKey)
    if (av === bv) return 0
    if (av == null || av === '') return 1
    if (bv == null || bv === '') return -1
    const cmp = av > bv ? 1 : -1
    return sortDir === 'asc' ? cmp : -cmp
  })
  return list
}
