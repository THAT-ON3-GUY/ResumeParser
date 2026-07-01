import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { readResumeText } from '../../../src/main/parser/fileReader.js'
import { LOW_TEXT_THRESHOLD, LOW_TEXT_WARNING } from '../../../src/renderer/src/lib/uploadStatus.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, '../fixtures')
const ROOT = join(__dirname, '../../..')

export async function run() {
  const pdf = await readResumeText(join(FIXTURES, 'sample-resume.pdf'))
  if (!pdf.text || pdf.charCount < 10) {
    throw new Error('sample-resume.pdf extraction returned too little text')
  }

  const docx = await readResumeText(join(FIXTURES, 'sample-resume.docx'))
  if (!docx.text.includes('Jane Recruit')) {
    throw new Error('sample-resume.docx extraction missing expected content')
  }

  const minimal = await readResumeText(join(FIXTURES, 'minimal-scanned.pdf'))
  if (minimal.charCount >= LOW_TEXT_THRESHOLD) {
    throw new Error('minimal-scanned.pdf should be below low-text threshold')
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'ri-11-'))
  const txtPath = join(tempDir, 'bad.txt')
  writeFileSync(txtPath, 'hello')
  try {
    await readResumeText(txtPath)
    throw new Error('readResumeText should reject .txt files')
  } catch (err) {
    if (!String(err.message).includes('Unsupported file type')) {
      throw err
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }

  const appSource = readFileSync(join(ROOT, 'src/renderer/src/App.jsx'), 'utf8')
  if (!appSource.includes('readResume') || !appSource.includes('UPLOAD_STATUS.EXTRACTING')) {
    throw new Error('App.jsx must run readResume before parseResume with extracting status')
  }
  if (!appSource.includes('handleRetryRow')) {
    throw new Error('App.jsx must support retry on failed uploads')
  }

  const tableSource = readFileSync(join(ROOT, 'src/renderer/src/components/ResultsTable.jsx'), 'utf8')
  if (!tableSource.includes('upload-warning') || !tableSource.includes('row-retry')) {
    throw new Error('ResultsTable must show low-text warning and retry control')
  }

  if (LOW_TEXT_WARNING !== 'File may be scanned — text extraction returned minimal content.') {
    throw new Error('LOW_TEXT_WARNING message mismatch')
  }

  return {
    ok: true,
    message: 'PDF/DOCX extraction, low-text threshold, reject .txt, upload UI pipeline OK'
  }
}
