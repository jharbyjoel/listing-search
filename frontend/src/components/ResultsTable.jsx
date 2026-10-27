// Shows one row per listing. Scores are stored as 0-1 and displayed as 0-100.
function ResultsTable({ results }) {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Address</th>
          <th scope="col">City</th>
          <th scope="col">Price</th>
          <th scope="col">Beds</th>
          <th scope="col">Baths</th>
          <th scope="col">Status</th>
          <th scope="col">Listed</th>
          <th scope="col">Score</th>
        </tr>
      </thead>
      <tbody>
        {results.map((listing) => (
          // ids are only unique within a source, so the key includes the source.
          <tr key={listing.source + '-' + listing.id}>
            <td>{listing.address}</td>
            <td>{listing.city}</td>
            <td>{'$' + listing.price.toLocaleString('en-US')}</td>
            <td>{listing.bedrooms}</td>
            <td>{listing.bathrooms}</td>
            <td>{listing.status}</td>
            <td>{listing.listedDate}</td>
            <td>{Math.round(listing.score * 100)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ResultsTable
