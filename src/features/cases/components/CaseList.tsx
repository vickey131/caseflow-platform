import { useSearchParams } from 'react-router'

function CaseList() {
  const [searchParams] = useSearchParams()

  return (
    <div>
      <h2>Cases</h2>
      <p>Query: {searchParams.toString()}</p>
    </div>
  )
}

export default CaseList
