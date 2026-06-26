import { extractWithGemini, summarizeWithGemini } from './geminiParser.js'
import store from '../store.js'

export const extractResume = async (resumeText) => {
  const provider = store.get('aiProvider', 'gemini')
  if (provider === 'claude') {
    throw new Error('Claude not implemented in milestone 1')
  }
  return extractWithGemini(resumeText)
}

export const summarizeFindings = async (data) => {
  const provider = store.get('aiProvider', 'gemini')
  if (provider === 'claude') {
    throw new Error('Claude not implemented in milestone 1')
  }
  return summarizeWithGemini(data)
}
