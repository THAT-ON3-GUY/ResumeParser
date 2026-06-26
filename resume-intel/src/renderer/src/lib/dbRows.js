/** Map SQLite candidate row to UI table row shape. */
export function candidateRecordToRow(record) {
  return {
    id: String(record.id),
    dbId: record.id,
    fileName: record.file_name,
    status: 'done',
    parsed: record.extracted_fields,
    searchResults: record.search_results,
    linkedinData: record.linkedin_data,
    error: null,
    createdAt: record.created_at
  }
}
