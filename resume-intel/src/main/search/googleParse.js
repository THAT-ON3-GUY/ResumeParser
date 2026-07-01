import { flagLinkedIn } from './searchQuery.js'

/**
 * @param {unknown} items
 * @returns {Array<{ title: string, snippet: string, url: string, isLinkedIn: boolean }>}
 */
export function parseGoogleItems(items) {
  if (!Array.isArray(items)) return []
  return items.slice(0, 5).map((item) => {
    const url = item?.link ?? ''
    return {
      title: String(item?.title ?? '').trim(),
      snippet: String(item?.snippet ?? '').trim(),
      url,
      isLinkedIn: flagLinkedIn(url)
    }
  })
}
