import { createBrowserRouter } from 'react-router'
import App from '../App.tsx'
import NotFound from './NotFound.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    children: [
      {
        path: 'cases',
        lazy: async () => ({
          Component: (await import('../features/cases/components/CaseList.tsx')).default,
        }),
      },
      {
        path: 'cases/new',
        lazy: async () => ({
          Component: (await import('../features/cases/components/CaseCreate.tsx')).default,
        }),
      },
      {
        path: 'cases/:id',
        lazy: async () => ({
          Component: (await import('../features/cases/components/CaseDetails.tsx')).default,
        }),
      },
      { path: '*', Component: NotFound },
    ],
  },
])
