/**
 * Generates minimal real PDF/DOCX fixtures for E2E upload tests.
 * Run: node scripts/verify/fixtures/generate-fixtures.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = __dirname

function writePdf() {
  const text = 'Jane Recruit\\nSenior Engineer at Acme Corp\\nSkills: JavaScript, React'
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    `4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream\nendobj`,
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj'
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(body.length)
    body += obj + '\n'
  }
  const xrefStart = body.length
  body += `xref\n0 ${objects.length + 1}\n`
  body += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  body += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`
  writeFileSync(join(OUT, 'sample-resume.pdf'), body)
}

async function writeDocx() {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  )
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Jane Recruit - Senior Engineer at Acme Corp. Skills: JavaScript, React. Boston, MA.</w:t></w:r></w:p>
  </w:body>
</w:document>`
  )
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync(join(OUT, 'sample-resume.docx'), buffer)
}

function writeGeminiResponse() {
  const data = {
    summary_title: 'Senior Engineer at Acme Corp',
    current_or_most_recent_employer: {
      company: 'Acme Corp',
      title: 'Senior Engineer',
      start_year: 2020,
      end_year: null
    },
    all_employers: [
      { company: 'Acme Corp', title: 'Senior Engineer', start_year: 2020, end_year: null }
    ],
    education: [{ school: 'State University', degree: 'BS', field: 'Computer Science', graduation_year: 2018 }],
    licenses_certifications: [],
    skills: ['JavaScript', 'React'],
    location_hints: ['Boston, MA'],
    associations_memberships: [],
    languages: ['English'],
    pronouns: null,
    years_experience: 6,
    contact_hints: [],
    parsing_confidence: 'high'
  }
  writeFileSync(join(OUT, 'gemini-response.json'), JSON.stringify(data, null, 2))
}

function writeDdgHtml() {
  writeFileSync(
    join(OUT, 'ddg-results.html'),
    `<html><body>
<div class="result">
  <a class="result__a" href="https://www.linkedin.com/in/jane-recruit">Jane Recruit - Engineer</a>
  <div class="result__snippet">Senior Engineer at Acme Corp</div>
  <a class="result__url" href="https://www.linkedin.com/in/jane-recruit">linkedin.com/in/jane-recruit</a>
</div>
</body></html>`
  )
}

function writeLinkedInHtml() {
  writeFileSync(
    join(OUT, 'linkedin-profile.html'),
    `<html><body>
<h1>Jane Recruit</h1>
<div class="text-body-medium">Senior Engineer at Acme Corp</div>
<div class="text-body-small inline">Boston, Massachusetts</div>
<p class="profile-about">Experienced software engineer focused on platform reliability.</p>
<div class="experience-entry">
  <span class="exp-title">Senior Engineer</span>
  <span class="exp-company">Acme Corp</span>
  <span class="exp-duration">2020 – Present</span>
</div>
<div class="education-entry">
  <span class="edu-school">State University</span>
  <span class="edu-degree">BS Computer Science</span>
</div>
<p class="contact-info">jane.recruit@example.com</p>
</body></html>`
  )
  writeFileSync(
    join(OUT, 'linkedin-profile-404.html'),
    `<html><body><h1>Page not found</h1><p>This page doesn't exist.</p></body></html>`
  )
  writeFileSync(
    join(OUT, 'linkedin-login.html'),
    `<html><body><form action="/login"><h1>Sign in to LinkedIn</h1></form></body></html>`
  )
}

mkdirSync(OUT, { recursive: true })
writePdf()
await writeDocx()
writeGeminiResponse()
writeDdgHtml()
writeLinkedInHtml()
console.log('[fixtures] Wrote sample-resume.pdf, sample-resume.docx, gemini-response.json, ddg-results.html, linkedin-profile.html, linkedin-profile-404.html, linkedin-login.html')
