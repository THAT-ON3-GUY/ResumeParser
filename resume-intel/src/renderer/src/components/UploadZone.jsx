export default function UploadZone({ onFilesSelected, rejectionMessage }) {
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer?.files
    if (files?.length) onFilesSelected(files)
  }

  const handleChange = (e) => {
    const files = e.target.files
    if (files?.length) onFilesSelected(files)
    e.target.value = ''
  }

  return (
    <section className="upload-zone" data-testid="upload-zone" onDragOver={handleDragOver} onDrop={handleDrop}>
      <p>
        <strong>Drag and drop</strong> resumes here, or{' '}
        <label className="file-label">
          choose files
          <input
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={handleChange}
            hidden
            data-testid="upload-input"
          />
        </label>
      </p>
      <p className="hint">Supported: .pdf, .docx — up to 50 files (batch parsing runs sequentially).</p>
      {rejectionMessage ? (
        <p className="upload-rejection" data-testid="upload-rejection" role="alert">
          {rejectionMessage}
        </p>
      ) : null}
    </section>
  )
}
