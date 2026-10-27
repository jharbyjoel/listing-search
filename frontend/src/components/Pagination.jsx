// Previous / Next controls with a "Page X of Y" label.
function Pagination({ page, totalPages, isLoading, onPageChange }) {
  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages

  // A page past the end has no results, so Previous jumps to the last real page.
  let previousPage = page - 1
  if (page > totalPages) {
    previousPage = totalPages
  }

  return (
    <div>
      <button
        type="button"
        disabled={isLoading || isFirstPage}
        onClick={() => onPageChange(previousPage)}
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
