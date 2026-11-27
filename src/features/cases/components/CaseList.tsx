import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Select, TextField } from 'innovations-ui-kit'
import { caseDtoSchema, mapCaseDto, type Case } from '../model/case.ts'
import './CaseList.css'

const statusOptions = caseDtoSchema.shape.status.options
const priorityOptions = caseDtoSchema.shape.priority.options

function label(value: string) {
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function CaseList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('page_size') ?? 20)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadCases() {
      setLoading(true)
      setError('')

      try {
        const query = new URLSearchParams(searchParams)
        if (!query.has('page_size')) query.set('page_size', '20')

        const response = await fetch(`/api/cases?${query}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Failed to load cases (${response.status})`)

        const data: unknown = await response.json()
        if (
          typeof data !== 'object' ||
          data === null ||
          !('items' in data) ||
          !Array.isArray(data.items) ||
          !('total' in data) ||
          typeof data.total !== 'number'
        ) {
          throw new Error('Invalid cases response')
        }

        setCases(data.items.map(mapCaseDto))
        setTotal(data.total)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'Failed to load cases')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadCases()
    return () => controller.abort()
  }, [searchParams])

  return (
    <div>
      <h2>Cases</h2>
      <div className="case-filters">
        <Select
          label="Status"
          placeholder="All"
          value={searchParams.get('status') ?? ''}
          onChange={(e) => updateParam('status', e.target.value)}
        >
          {statusOptions.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </Select>
        <Select
          label="Priority"
          placeholder="All"
          value={searchParams.get('priority') ?? ''}
          onChange={(e) => updateParam('priority', e.target.value)}
        >
          {priorityOptions.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </Select>
        <TextField
          label="Search cases"
          type="search"
          value={searchParams.get('q') ?? ''}
          onChange={(e) => updateParam('q', e.target.value)}
        />
      </div>
      {loading && <p>Loading cases...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <>
          <p>
            {total === 0
              ? 'No cases found'
              : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total} cases`}
          </p>
          {cases.length === 0 ? (
            <p>No cases to display.</p>
          ) : (
            <table className="case-list__table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Customer</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/cases/${item.id}`}>{item.reference}</Link>
                    </td>
                    <td>{item.title}</td>
                    <td>{label(item.status)}</td>
                    <td>{label(item.priority)}</td>
                    <td>{item.customer.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div aria-label="Case pagination">
            <label>
              Cases per page
              <select
                value={pageSize}
                onChange={(event) => updateParam('page_size', event.target.value)}
              >
                {[20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => updateParam('page', String(page - 1))}
              disabled={loading || page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => updateParam('page', String(page + 1))}
              disabled={loading || page >= pageCount}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default CaseList
