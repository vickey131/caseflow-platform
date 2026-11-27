// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { CaseDto } from '../model/case.ts'
import CaseList from './CaseList.tsx'

vi.mock('innovations-ui-kit', () => ({
  TextField: ({
    label,
    ...props
  }: ComponentProps<'input'> & { label: string }) =>
    createElement('label', null, label, createElement('input', props)),
  Select: ({
    label,
    children,
    ...props
  }: ComponentProps<'select'> & { label: string }) =>
    createElement('label', null, label, createElement('select', props, children)),
}))

const caseDto: CaseDto = {
  id: 'case-101',
  reference: 'CF-101',
  title: 'Unable to open dashboard',
  description: 'The dashboard returns an error.',
  status: 'new',
  priority: 'high',
  category: 'bug',
  customer: {
    id: 'customer-1',
    name: 'Northwind Health',
    email: 'it@northwind.example',
  },
  assignee_id: null,
  tags: ['dashboard'],
  created_at: '2026-09-14T09:12:00Z',
  updated_at: '2026-09-15T10:30:00Z',
  due_at: null,
}

const fetchMock = vi.fn()

function jsonResponse(items: CaseDto[], total = items.length) {
  return {
    ok: true,
    json: async () => ({ items, total }),
  }
}

function renderCaseList(initialEntry = '/cases') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<CaseList />} />
      </Routes>
    </MemoryRouter>,
  )
}

function expectLatestRequestToHave(params: Record<string, string>) {
  const [requestUrl] = fetchMock.mock.lastCall as [string]
  const search = new URL(requestUrl, window.location.origin).searchParams

  for (const [key, value] of Object.entries(params)) {
    expect(search.get(key)).toBe(value)
  }
}

beforeEach(() => {
  fetchMock.mockResolvedValue(jsonResponse([caseDto]))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('CaseList', () => {
  it('shows a loading message while cases are being fetched', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))

    renderCaseList()

    expect(screen.getByText('Loading cases...')).toBeTruthy()
  })

  it('renders case details after loading', async () => {
    renderCaseList()

    expect(await screen.findByRole('link', { name: 'CF-101' })).toBeTruthy()
    expect(screen.getByText('Unable to open dashboard')).toBeTruthy()
    expect(screen.getByText('Northwind Health')).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'New' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'High' })).toBeTruthy()
  })

  it('updates the search query and resets to the first page', async () => {
    renderCaseList('/cases?page=3')
    fireEvent.change(screen.getByLabelText('Search cases'), {
      target: { value: 'dashboard' },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expectLatestRequestToHave({ q: 'dashboard', page: '1' })
  })

  it('updates the status filter and resets to the first page', async () => {
    renderCaseList('/cases?page=3')
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'in_progress' },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expectLatestRequestToHave({ status: 'in_progress', page: '1' })
  })

  it('updates the priority filter and resets to the first page', async () => {
    renderCaseList('/cases?page=3')
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'urgent' },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expectLatestRequestToHave({ priority: 'urgent', page: '1' })
  })

  it('updates the page size and resets to the first page', async () => {
    renderCaseList('/cases?page=3')
    fireEvent.change(await screen.findByLabelText('Cases per page'), {
      target: { value: '50' },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expectLatestRequestToHave({ page_size: '50', page: '1' })
  })

  it('shows an error when the cases request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    })

    renderCaseList()

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Failed to load cases (500)',
    )
  })
})
