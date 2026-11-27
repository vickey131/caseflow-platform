import { describe, expect, it } from 'vitest'
import { caseDtoSchema, mapCaseDto, type CaseDto } from './case'

const validDto: CaseDto = {
  id: 'c-0042',
  reference: 'CF-1042',
  title: 'Cannot export monthly report',
  description: 'Export button spins forever for March.',
  status: 'new',
  priority: 'high',
  category: 'bug',
  customer: { id: 'cust-7', name: 'Northwind Health', email: 'it@northwind.example' },
  assignee_id: null,
  tags: ['reports'],
  created_at: '2026-09-14T09:12:00Z',
  updated_at: '2026-09-15T10:30:00Z',
  due_at: null,
}

describe('caseDtoSchema', () => {
  it('accepts a valid DTO', () => {
    expect(caseDtoSchema.safeParse(validDto).success).toBe(true)
  })

  it('rejects a title shorter than 5 characters', () => {
    expect(caseDtoSchema.safeParse({ ...validDto, title: 'Oops' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(caseDtoSchema.safeParse({ ...validDto, status: 'archived' }).success).toBe(false)
  })

  it('rejects an invalid timestamp', () => {
    expect(caseDtoSchema.safeParse({ ...validDto, created_at: 'yesterday' }).success).toBe(false)
  })
})

describe('mapCaseDto', () => {
  it('maps snake_case fields to camelCase', () => {
    const result = mapCaseDto({ ...validDto, assignee_id: 'u-2' })

    expect(result.assigneeId).toBe('u-2')
    expect(result).not.toHaveProperty('assignee_id')
    expect(result).not.toHaveProperty('created_at')
    expect(result).toMatchObject({
      id: 'c-0042',
      reference: 'CF-1042',
      title: validDto.title,
      status: 'new',
      priority: 'high',
      category: 'bug',
      customer: validDto.customer,
      tags: ['reports'],
    })
  })

  it('converts timestamp strings to Date objects', () => {
    const result = mapCaseDto({ ...validDto, due_at: '2026-10-01T00:00:00Z' })

    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.updatedAt).toBeInstanceOf(Date)
    expect(result.dueAt).toBeInstanceOf(Date)
    expect(result.createdAt.toISOString()).toBe('2026-09-14T09:12:00.000Z')
    expect(result.updatedAt.toISOString()).toBe('2026-09-15T10:30:00.000Z')
    expect(result.dueAt?.toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })

  it('keeps null assignee_id and due_at as null', () => {
    const result = mapCaseDto(validDto)

    expect(result.assigneeId).toBeNull()
    expect(result.dueAt).toBeNull()
  })

  it('throws on an invalid DTO', () => {
    expect(() => mapCaseDto({ ...validDto, priority: 'asap' })).toThrow()
  })
})
