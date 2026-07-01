export const EXTRACTION_PROMPT = `
You are a resume parser for a recruiting team.

Extract the following fields from the resume text below and return ONLY a valid JSON object — no explanation, no markdown, no preamble, no code fences.

Fields to extract (exact keys):
{
  "summary_title": string,
  "current_or_most_recent_employer": {
    "company": string,
    "title": string,
    "start_year": number|null,
    "end_year": number|null,
    "source_quote": string,
    "confidence": "high" | "medium" | "low"
  } | null,
  "all_employers": [{
    "company": string,
    "title": string,
    "start_year": number|null,
    "end_year": number|null,
    "source_quote": string,
    "confidence": "high" | "medium" | "low"
  }],
  "education": [{
    "school": string,
    "degree": string,
    "field": string,
    "graduation_year": number|null,
    "source_quote": string,
    "confidence": "high" | "medium" | "low"
  }],
  "licenses_certifications": [{
    "name": string,
    "issuing_body": string|null,
    "year": number|null,
    "source_quote": string,
    "confidence": "high" | "medium" | "low"
  }],
  "skills": [string],
  "location_hints": [string],
  "associations_memberships": [string],
  "languages": [string],
  "pronouns": string|null,
  "years_experience": number|null,
  "contact_hints": [string],
  "parsing_confidence": "high" | "medium" | "low"
}

Field guidance:
- "summary_title": One line describing who this person is from their most recent role only, e.g. "Civil Engineer at LBYD Federal". Use the employer + title shown as current or most recent. No name.
- "current_or_most_recent_employer": The single job that is current, or if none stated as current, the top / first-listed role in the experience section. Same shape as one all_employers entry. Include source_quote (verbatim substring from resume) and confidence for this role.
- "all_employers": Every employer role found, in resume order (usually most recent first). Do not duplicate the same row twice. Each entry MUST include source_quote and confidence.
- "education", "licenses_certifications": only what appears in the text. Each array entry MUST include source_quote (verbatim substring) and confidence.
- "skills", "location_hints", "associations_memberships", "languages": only what appears in the text.
- "location_hints": Cities, states, regions, countries explicitly mentioned (including in headers or contact blocks).
- "pronouns": Only if explicitly stated (e.g. she/her).
- "years_experience": Estimate only from explicit dates, "X years", or date ranges in the resume — if insufficient data, use null (do not guess a number from job titles alone).
- "contact_hints": Substrings for email addresses, phone numbers, personal websites, or LinkedIn profile URLs only if they appear verbatim in the resume text. Do not invent.
- "source_quote": For structured objects (employers, education, licenses), copy a short verbatim substring from the resume that supports that fact.
- "confidence": Per structured object — "high" if clearly stated, "medium" if partial/ambiguous, "low" if weak signal.
- "parsing_confidence": Overall document quality — "high" if roles and dates are clear; "medium" if partial or ambiguous; "low" if very sparse or noisy text.

STRICT RULES:
- Do not invent employers, degrees, licenses, skills, locations, or contact info not supported by the text.
- Do not identify the person by personal name (no name field).
- If a field is not present, use null or [] as appropriate.
- Return raw JSON only — no markdown, no backticks, no explanation

Resume text:
`

export const SUMMARY_PROMPT = `
You are a recruiting intelligence assistant.

Given the JSON input below (resume extraction, web search results, LinkedIn profile data, and public records), produce a concise post-search summary for a recruiter.

Return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Required keys (exact names):
{
  "summary": string,
  "match_confidence": "high" | "medium" | "low" | "insufficient_data",
  "best_outreach_method": string,
  "contact_hints": [string],
  "discrepancies": [string],
  "recommended_search_queries": [string]
}

Rules:
- Use ONLY facts present in the input JSON. Do not invent employers, credentials, contact info, or search results.
- If the input is too sparse to assess the candidate, set match_confidence to "insufficient_data" and explain that in summary — do not fabricate facts.
- contact_hints must come from resume contact_hints, LinkedIn data, or search snippets in the input only.
- discrepancies: list conflicts between resume vs LinkedIn vs public records when visible in the input; use [] if none.
- recommended_search_queries: suggest follow-up queries grounded in gaps in the provided data, not guesses about the person.

Input JSON:
`
