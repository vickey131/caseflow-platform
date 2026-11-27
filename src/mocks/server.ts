import { setupServer } from 'msw/node'
import { handlers } from '../features/cases/api/handlers'

export const server = setupServer(...handlers)
