import { parseGoogleItems } from '../../../src/main/search/googleParse.js'

export async function run() {
  const parsed = parseGoogleItems([
    {
      title: 'Jane Recruit | LinkedIn',
      link: 'https://www.linkedin.com/in/jane-recruit',
      snippet: 'Engineer at Acme'
    },
    { title: 'Other', link: 'https://example.com', snippet: 'x' }
  ])

  if (parsed.length !== 2) throw new Error('parseGoogleItems should return 2 items')
  if (!parsed[0].isLinkedIn) throw new Error('LinkedIn URL should set isLinkedIn true')
  if (parsed[1].isLinkedIn) throw new Error('non-LinkedIn URL should not set isLinkedIn')

  const empty = parseGoogleItems(null)
  if (empty.length !== 0) throw new Error('parseGoogleItems(null) should be empty')

  return { ok: true, message: 'parseGoogleItems maps Google API items correctly' }
}
