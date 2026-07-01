/** Per-file upload pipeline status labels (feature 1.1). */
export const UPLOAD_STATUS = {
  QUEUED: 'queued',
  EXTRACTING: 'extracting',
  PARSING: 'parsing',
  DONE: 'done',
  ERROR: 'error'
}

export const LOW_TEXT_WARNING =
  'File may be scanned — text extraction returned minimal content.'

export const LOW_TEXT_THRESHOLD = 100

export function isProcessingStatus(status) {
  return (
    status === UPLOAD_STATUS.QUEUED ||
    status === UPLOAD_STATUS.EXTRACTING ||
    status === UPLOAD_STATUS.PARSING
  )
}

export function uploadStatusLabel(row) {
  switch (row.status) {
    case UPLOAD_STATUS.QUEUED:
      return 'Queued'
    case UPLOAD_STATUS.EXTRACTING:
      return 'Extracting'
    case UPLOAD_STATUS.PARSING:
      return 'Parsing'
    case UPLOAD_STATUS.ERROR:
      return `Error: ${row.error ?? 'Unknown error'}`
    default:
      return 'Done'
  }
}
