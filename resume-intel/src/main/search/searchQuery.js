/**
 * Shared search query builder (no Playwright / Electron imports).
 * @param {object|null} extractedFields
 * @param {{ linkedInOnly?: boolean }} options
 */
export function buildQuery(extractedFields, { linkedInOnly = true } = {}) {
  const parts = []
  const employer =
    extractedFields?.current_or_most_recent_employer?.company ??
    extractedFields?.all_employers?.[0]?.company ??
    extractedFields?.previous_employers?.[0]?.company

  if (employer) parts.push(`"${employer}"`)

  const edu = extractedFields?.education?.[0]
  if (edu?.graduation_year != null) parts.push(String(edu.graduation_year))
  if (edu?.school) parts.push(`"${edu.school}"`)

  const license = extractedFields?.licenses_certifications?.[0]?.name
  if (license) parts.push(`"${license}"`)

  if (linkedInOnly) parts.push('site:linkedin.com/in')

  return parts.filter(Boolean).join(' ')
}

export function flagLinkedIn(url) {
  return /linkedin\.com\/in\//i.test(url || '')
}
