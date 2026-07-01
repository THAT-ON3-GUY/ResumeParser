import { describe, expect, it } from 'vitest'

import { selectPublicSources } from '../../src/main/search/publicSources.js'

describe('selectPublicSources', () => {
  it('notes PE license board check when licenses are structured objects', () => {
    const { sources, notes } = selectPublicSources({
      licenses_certifications: [{ name: 'PE License', issuing_body: 'Colorado State Board' }],
      skills: []
    })

    expect(sources).not.toContain('npi')
    expect(notes.join(' ')).toMatch(/engineering license board/i)
  })
})
