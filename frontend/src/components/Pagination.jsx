// Previous / Next controls with a "Page X of Y" label.
function Pagination({ page, totalPages, isLoading, onPageChange }) {
  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages

  return (
    <div>
      <button
        type="button"
        disabled={isLoading || isFirstPage}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>{`Page ${page} of ${totalPages}`}</span>
      <button
        type="button"
        disabled={isLoading || isLastPage}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  )
}

export default Pagination
