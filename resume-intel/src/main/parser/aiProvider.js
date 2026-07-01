import { extractWithGemini, summarizeWithGemini } from './geminiParser.js'
import { extractWithClaude, summarizeWithClaude } from './claudeParser.js'
import store from '../store.js'

export const extractResume = async (resumeText) => {
  const provider = store.get('aiProvider', 'gemini')
  console.log('[aiProvider] extractResume provider=', provider)
  if (provider === 'claude') {
    return extractWithClaude(resumeText)
  }
  return extractWithGemini(resumeText)
}

export const summarizeFindings = async (data) => {
  const provider = store.get('aiProvider', 'gemini')
  console.log('[aiProvider] summarizeFindings provider=', provider)
  if (provider === 'claude') {
    return summarizeWithClaude(data)
  }
  return summarizeWithGemini(data)
}
