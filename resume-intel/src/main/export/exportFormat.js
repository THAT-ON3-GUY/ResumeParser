export const TOP_LEVEL_FIELD_KEYS = [
  'summary_title',
  'current_or_most_recent_employer',
  'all_employers',
  'education',
  'licenses_certifications',
  'skills',
  'location_hints',
  'associations_memberships',
  'languages',
  'pronouns',
  'years_experience',
  'contact_hints',
  'parsing_confidence'
]

export const CSV_HEADERS = ['file_name', ...TOP_LEVEL_FIELD_KEYS]

export function serializeFieldValue(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (!value.length) return ''
    if (typeof value[0] === 'string') return value.join('; ')
    return JSON.stringify(value)
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function flattenCandidateFields(record) {
  const fields = record.extracted_fields ?? {}
  const row = { file_name: record.file_name }
  for (const key of TOP_LEVEL_FIELD_KEYS) {
    row[key] = serializeFieldValue(fields[key])
  }
  return row
}

export function collectSourceUrls(record) {
  const rows = []
  const fileName = record.file_name
  for (const hit of record.search_results?.results ?? []) {
    if (!hit?.url) continue
    rows.push({
      file_name: fileName,
      source_type: hit.isLinkedIn ? 'linkedin_search' : 'web_search',
      url: hit.url,
      title: hit.title ?? ''
    })
  }
  if (record.linkedin_data?.profileUrl) {
    rows.push({
      file_name: fileName,
      source_type: 'linkedin_profile',
      url: record.linkedin_data.profileUrl,
      title: record.linkedin_data.name ?? ''
    })
  }
  return rows
}

export function csvEscape(value) {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function candidateToCsvLine(record) {
  const flat = flattenCandidateFields(record)
  return CSV_HEADERS.map((header) => csvEscape(flat[header])).join(',')
}
