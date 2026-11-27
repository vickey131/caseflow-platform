import { z } from 'zod'

export const caseDtoSchema = z.object({
  id: z.string(),
  reference: z.string(),
  title: z.string().min(5).max(120),
  description: z.string().max(4000),
  status: z.enum(['new', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['bug', 'access', 'question', 'feature_request']),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
  }),
  assignee_id: z.string().nullable(),
  tags: z.array(z.string()),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  due_at: z.iso.datetime().nullable(),
})

export type CaseDto = z.infer<typeof caseDtoSchema>

export type Case = {
  id: string
  reference: string
  title: string
  description: string
  status: CaseDto['status']
  priority: CaseDto['priority']
  category: CaseDto['category']
  customer: CaseDto['customer']
  assigneeId: string | null
  tags: string[]
  createdAt: Date
  updatedAt: Date
  dueAt: Date | null
}

export function mapCaseDto(dto: unknown): Case {
  const parsed = caseDtoSchema.parse(dto)

  return {
    id: parsed.id,
    reference: parsed.reference,
    title: parsed.title,
    description: parsed.description,
    status: parsed.status,
    priority: parsed.priority,
    category: parsed.category,
    customer: parsed.customer,
    assigneeId: parsed.assignee_id,
    tags: parsed.tags,
    createdAt: new Date(parsed.created_at),
    updatedAt: new Date(parsed.updated_at),
    dueAt: parsed.due_at === null ? null : new Date(parsed.due_at),
  }
}
