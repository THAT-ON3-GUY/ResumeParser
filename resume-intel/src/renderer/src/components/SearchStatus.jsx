export default function SearchStatus({ message }) {
  if (!message) return null
  return (
    <p className="search-status" data-testid="search-status" role="status">
      {message}
    </p>
  )
}
