import { describe, expect, it } from 'vitest'

import { buildQuery } from '../../src/main/search/duckduckgo.js'

const FULL_FIELDS = {
  current_or_most_recent_employer: { company: 'Acme Corp', title: 'Engineer' },
  education: [{ school: 'State University', graduation_year: 2018 }],
  licenses_certifications: [{ name: 'PE License' }]
}

describe('buildQuery', () => {
  it('builds a query from all available fields', () => {
    const query = buildQuery(FULL_FIELDS)
    expect(query).toContain('"Acme Corp"')
    expect(query).toContain('2018')
    expect(query).toContain('"State University"')
    expect(query).toContain('"PE License"')
    expect(query).toContain('site:linkedin.com/in')
  })

  it('builds a partial query when only some fields exist', () => {
    const query = buildQuery({
      all_employers: [{ company: 'Beta LLC', title: 'Analyst' }]
    })
    expect(query).toBe('"Beta LLC" site:linkedin.com/in')
  })

  it('returns only the LinkedIn site filter when fields are empty', () => {
    expect(buildQuery(null)).toBe('site:linkedin.com/in')
    expect(buildQuery({})).toBe('site:linkedin.com/in')
  })
})
