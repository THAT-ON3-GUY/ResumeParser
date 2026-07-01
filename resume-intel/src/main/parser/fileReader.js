import 'pdf-parse/worker'
import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

/**
 * @param {string} filePath
 * @returns {Promise<{ text: string, fileName: string, charCount: number }>}
 */
export async function readResumeText(filePath) {
  const fileName = basename(filePath)
  const ext = extname(filePath).toLowerCase()

  let text = ''

  if (ext === '.pdf') {
    const buffer = await readFile(filePath)
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      text = result.text ?? ''
    } finally {
      await parser.destroy()
    }
  } else if (ext === '.docx') {
    const buffer = await readFile(filePath)
    const result = await mammoth.extractRawText({ buffer })
    text = result.value ?? ''
  } else {
    throw new Error(`Unsupported file type: ${ext || '(none)'} — use .pdf or .docx`)
  }

  return { text, fileName, charCount: text.length }
}
