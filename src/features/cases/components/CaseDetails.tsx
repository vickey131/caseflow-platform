import { useParams } from 'react-router'

function CaseDetails() {
  const { id } = useParams()

  return <h2>Case {id}</h2>
}

export default CaseDetails
