import { describe, expect, it } from 'vitest'

import { EXTRACTION_PROMPT } from '../../src/main/parser/prompts.js'

const REQUIRED_FIELD_NAMES = [
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
  'parsing_confidence',
  'source_quote',
  'confidence'
]

describe('EXTRACTION_PROMPT', () => {
  it('includes every required extraction field name', () => {
    for (const field of REQUIRED_FIELD_NAMES) {
      expect(EXTRACTION_PROMPT).toContain(`"${field}"`)
    }
  })
})
