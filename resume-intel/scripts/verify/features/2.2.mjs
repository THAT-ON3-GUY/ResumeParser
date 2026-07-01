import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')

export async function run() {
  const claudeSrc = readFileSync(join(ROOT, 'src/main/parser/claudeParser.js'), 'utf8')
  if (!claudeSrc.includes('extractWithClaude')) {
    throw new Error('claudeParser.js missing extractWithClaude')
  }
  if (!claudeSrc.includes('summarizeWithClaude')) {
    throw new Error('claudeParser.js missing summarizeWithClaude')
  }
  if (!claudeSrc.includes('EXTRACTION_PROMPT') || !claudeSrc.includes('SUMMARY_PROMPT')) {
    throw new Error('claudeParser.js must use shared prompts from prompts.js')
  }
  if (!claudeSrc.includes('claude-sonnet-4-20250514')) {
    throw new Error('claudeParser.js missing default Claude model')
  }
  if (!claudeSrc.includes('Claude API key not set. Add it in Settings.')) {
    throw new Error('claudeParser.js missing canonical Claude API key error')
  }
  if (!claudeSrc.includes('parseGeminiJson')) {
    throw new Error('claudeParser.js must reuse JSON parse/repair from geminiParser')
  }
  if (claudeSrc.includes('@anthropic-ai')) {
    throw new Error('claudeParser.js must not import Anthropic SDK')
  }

  const providerSrc = readFileSync(join(ROOT, 'src/main/parser/aiProvider.js'), 'utf8')
  if (!providerSrc.includes('extractWithClaude')) {
    throw new Error('aiProvider.js must route extraction to Claude')
  }
  if (!providerSrc.includes('summarizeWithClaude')) {
    throw new Error('aiProvider.js must route summarization to Claude')
  }
  if (providerSrc.includes('Claude not implemented')) {
    throw new Error('aiProvider.js still stubs Claude provider')
  }
  if (!providerSrc.includes('[aiProvider] extractResume provider=')) {
    throw new Error('aiProvider.js must log provider used for extraction')
  }

  const rendererFiles = [
    'src/renderer/src/App.jsx',
    'src/renderer/src/components/SettingsPanel.jsx',
    'src/renderer/src/components/CandidateDetailDrawer.jsx'
  ]
  for (const rel of rendererFiles) {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    if (src.includes('anthropic.com/v1') || src.includes('@anthropic-ai')) {
      throw new Error(`${rel} must not call Claude API directly`)
    }
  }

  return { ok: true, message: 'Claude parser, aiProvider routing, prompts, and isolation validated' }
}
