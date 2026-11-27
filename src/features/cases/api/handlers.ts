import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { caseDtoSchema, type CaseDto } from '../model/case'

type Status = CaseDto['status']

const SEED = 20260920
const BASE_TIME = Date.parse('2026-11-20T12:00:00Z')
const DAY = 86_400_000

const users = [
  { id: 'u-1', name: 'Priya Shah', role: 'admin' },
  { id: 'u-2', name: 'Marcus Lee', role: 'agent' },
  { id: 'u-3', name: 'Sofia Romero', role: 'agent' },
  { id: 'u-4', name: 'Tom Becker', role: 'viewer' },
]

const customers = [
  ['Northwind Health', 'northwind'],
  ['Contoso Labs', 'contoso'],
  ['Fabrikam Logistics', 'fabrikam'],
  ['Adventure Works', 'adventure'],
  ['Tailspin Travel', 'tailspin'],
  ['Litware Systems', 'litware'],
  ['Wingtip Toys', 'wingtip'],
  ['Proseware Finance', 'proseware'],
  ['Lucerne Publishing', 'lucerne'],
  ['Margie Insurance', 'margie'],
  ['Alpine Ski House', 'alpine'],
  ['Coho Vineyard', 'coho'],
].map(([name, slug], i) => ({ id: `cust-${i + 1}`, name, email: `it@${slug}.example` }))

const STATUSES = ['new', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const CATEGORIES = ['bug', 'access', 'question', 'feature_request'] as const
const TAGS = ['reports', 'login', 'billing', 'export', 'api', 'ui', 'performance', 'onboarding']
const VERBS = ['Cannot export', 'Unable to access', 'Question about', 'Request for', 'Error when opening', 'Slow response in']
const NOUNS = ['monthly report', 'billing portal', 'user permissions', 'dashboard', 'API key', 'data import', 'audit log']

const TRANSITIONS: Record<Status, Status[]> = {
  new: ['in_progress'],
  in_progress: ['waiting_on_customer', 'resolved'],
  waiting_on_customer: ['in_progress', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['in_progress'],
}

const PRIORITY_RANK: Record<CaseDto['priority'], number> = { low: 0, medium: 1, high: 2, urgent: 3 }
const SORT_FIELDS = ['created_at', 'updated_at', 'priority', 'reference'] as const

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildSeed(): CaseDto[] {
  const rand = mulberry32(SEED)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  return Array.from({ length: 1000 }, (_, i) => {
    const n = i + 1
    const created = BASE_TIME - Math.floor(rand() * 90 * DAY)
    const updated = created + Math.floor(rand() * (BASE_TIME - created))
    const noun = pick(NOUNS)
    const tagCount = Math.floor(rand() * 3)
    return {
      id: `c-${String(n).padStart(4, '0')}`,
      reference: `CF-${1000 + n}`,
      title: `${pick(VERBS)} ${noun}`,
      description: `Seeded case ${n} about the ${noun}.`,
      status: pick(STATUSES),
      priority: pick(PRIORITIES),
      category: pick(CATEGORIES),
      customer: pick(customers),
      assignee_id: rand() < 0.25 ? null : pick(users.slice(0, 3)).id,
      tags: [...new Set(Array.from({ length: tagCount }, () => pick(TAGS)))],
      created_at: new Date(created).toISOString(),
      updated_at: new Date(updated).toISOString(),
      due_at: rand() < 0.4 ? new Date(created + Math.floor(rand() * 30 * DAY)).toISOString() : null,
    }
  })
}

let cases = buildSeed()

function errorResponse(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, ...(fields && { fields }) } }, { status })
}

const FAIL_CODES: Record<number, [string, string]> = {
  404: ['not_found', 'Injected not found error'],
  409: ['invalid_transition', 'Injected conflict error'],
  500: ['internal_error', 'Injected server error'],
}

// Applies x-mock-delay / mock_delay and x-mock-fail / mock_fail (header wins over query).
async function inject(request: Request) {
  const params = new URL(request.url).searchParams
  const ms = Number(request.headers.get('x-mock-delay') ?? params.get('mock_delay'))
  if (ms > 0) await delay(ms)
  const fail = Number(request.headers.get('x-mock-fail') ?? params.get('mock_fail'))
  if (fail in FAIL_CODES) return errorResponse(fail, ...FAIL_CODES[fail])
  return undefined
}

function validationError(error: z.ZodError) {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) fields[String(issue.path[0] ?? 'body')] ??= issue.message
  return errorResponse(400, 'validation_failed', 'Validation failed', fields)
}

const shape = caseDtoSchema.shape
const createSchema = z.object({
  title: shape.title,
  description: shape.description,
  priority: shape.priority,
  category: shape.category,
  customer_id: z.string(),
  tags: shape.tags.optional(),
  due_at: shape.due_at.optional(),
})
const patchSchema = z
  .object({
    title: shape.title,
    description: shape.description,
    priority: shape.priority,
    category: shape.category,
    status: shape.status,
    assignee_id: shape.assignee_id,
    tags: shape.tags,
    due_at: shape.due_at,
  })
  .partial()

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

export const handlers = [
  http.get('/api/cases', async ({ request }) => {
    const failed = await inject(request)
    if (failed) return failed
    const params = new URL(request.url).searchParams
    const page = Number(params.get('page') ?? 1)
    const pageSize = Number(params.get('page_size') ?? 20)
    const sort = params.get('sort') ?? '-created_at'
    const field = sort.replace(/^-/, '') as (typeof SORT_FIELDS)[number]
    const fields: Record<string, string> = {}
    if (!Number.isInteger(page) || page < 1) fields.page = 'Page must be a positive integer'
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) fields.page_size = 'Page size must be 1-100'
    if (!SORT_FIELDS.includes(field)) fields.sort = `Sort must be one of ${SORT_FIELDS.join(', ')}`
    if (Object.keys(fields).length) return errorResponse(400, 'validation_failed', 'Invalid query parameters', fields)

    const list = (key: string) => params.get(key)?.split(',').filter(Boolean)
    const statuses = list('status')
    const priorities = list('priority')
    const q = params.get('q')?.trim().toLowerCase()
    const dir = sort.startsWith('-') ? -1 : 1
    const sortKey = (c: CaseDto) => (field === 'priority' ? PRIORITY_RANK[c.priority] : c[field])

    const matched = cases
      .filter((c) => !statuses || statuses.includes(c.status))
      .filter((c) => !priorities || priorities.includes(c.priority))
      .filter(
        (c) =>
          !q ||
          c.reference.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.customer.name.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const x = sortKey(a)
        const y = sortKey(b)
        return (x < y ? -1 : x > y ? 1 : a.id < b.id ? -1 : 1) * dir
      })

    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: matched.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total: matched.length,
    })
  }),

  http.get('/api/cases/:id', async ({ request, params }) => {
    const failed = await inject(request)
    if (failed) return failed
    const found = cases.find((c) => c.id === params.id)
    return found ? HttpResponse.json(found) : errorResponse(404, 'not_found', 'Case not found')
  }),

  http.post('/api/cases', async ({ request }) => {
    const failed = await inject(request)
    if (failed) return failed
    const parsed = createSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const customer = customers.find((c) => c.id === parsed.data.customer_id)
    if (!customer) return errorResponse(400, 'validation_failed', 'Validation failed', { customer_id: 'Unknown customer' })

    const n = cases.length + 1
    const now = new Date().toISOString()
    const created: CaseDto = {
      id: `c-${String(n).padStart(4, '0')}`,
      reference: `CF-${1000 + n}`,
      title: parsed.data.title,
      description: parsed.data.description,
      status: 'new',
      priority: parsed.data.priority,
      category: parsed.data.category,
      customer,
      assignee_id: null,
      tags: parsed.data.tags ?? [],
      created_at: now,
      updated_at: now,
      due_at: parsed.data.due_at ?? null,
    }
    cases.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('/api/cases/:id', async ({ request, params }) => {
    const failed = await inject(request)
    if (failed) return failed
    const index = cases.findIndex((c) => c.id === params.id)
    if (index === -1) return errorResponse(404, 'not_found', 'Case not found')
    const parsed = patchSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)

    const current = cases[index]
    const next = parsed.data.status
    if (next && next !== current.status && !TRANSITIONS[current.status].includes(next)) {
      return errorResponse(409, 'invalid_transition', `Cannot change status from ${current.status} to ${next}`)
    }
    const updated: CaseDto = { ...current, ...parsed.data, updated_at: new Date().toISOString() }
    cases[index] = updated
    return HttpResponse.json(updated)
  }),

  http.get('/api/users', async ({ request }) => {
    const failed = await inject(request)
    return failed ?? HttpResponse.json(users)
  }),

  http.get('/api/customers', async ({ request }) => {
    const failed = await inject(request)
    return failed ?? HttpResponse.json(customers)
  }),

  http.post('/api/test/reset', async ({ request }) => {
    const failed = await inject(request)
    if (failed) return failed
    cases = buildSeed()
    return new HttpResponse(null, { status: 204 })
  }),
]
