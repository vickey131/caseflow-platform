import { setupWorker } from 'msw/browser'
import { handlers } from '../features/cases/api/handlers'

export const worker = setupWorker(...handlers)
