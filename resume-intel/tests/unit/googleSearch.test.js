import { describe, expect, it } from 'vitest'

import { parseGoogleItems } from '../../src/main/search/googleParse.js'

describe('parseGoogleItems', () => {
  it('maps API items and flags LinkedIn URLs', () => {
    const items = parseGoogleItems([
      {
        title: 'Profile | LinkedIn',
        link: 'https://www.linkedin.com/in/test-user',
        snippet: 'Engineer'
      }
    ])
    expect(items).toHaveLength(1)
    expect(items[0].isLinkedIn).toBe(true)
    expect(items[0].title).toBe('Profile | LinkedIn')
  })

  it('returns empty array for non-array input', () => {
    expect(parseGoogleItems(undefined)).toEqual([])
  })
})
