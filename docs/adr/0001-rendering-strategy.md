# ADR 0001: Rendering strategy for CaseFlow

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

CaseFlow is an internal case-management application used by support agents and administrators.

The application requires:
- Dynamic case listing with URL-based search, filtering, sorting and pagination.
- Case creation, editing and status management.
- User-specific interfaces based on simulated roles.
- Frequent interaction with a backend API.
- A responsive interface that can handle large case datasets.

Search-engine optimisation is not a requirement because the application is intended for internal users.

## Decision

Use a **React Single Page Application (SPA) built with Vite**.

The browser will render the application and handle client-side navigation. Case data will be retrieved from the backend API.

React Router will manage application routes and URL-based list state.

## Alternatives considered

### Server-Side Rendering (SSR)

SSR could generate the initial HTML on the server and support server-side data loading.

However, CaseFlow does not require SEO, and its primary workflows are highly interactive. The additional server runtime and deployment complexity are not justified by the benefits.

### Static Site Generation (SSG)

SSG generates pages during the build process.

CaseFlow contains frequently changing, user-specific case data. Pre-generated pages would not be suitable as the primary rendering approach.

## Consequences

### Positive
- Simpler deployment using static hosting or a CDN.
- No dedicated React rendering server is required.
- Well suited to interactive dashboards and authenticated workflows.
- Client-side routing provides smooth navigation.
- The frontend can communicate with a real backend API when one becomes available.

### Trade-offs
- The initial JavaScript bundle must be downloaded before the application becomes fully interactive.
- The hosting platform must support SPA route fallback to `index.html`.
- Data loading, errors and loading states must be handled by the client.
- Authentication and authorisation must be enforced by the backend, not by frontend role checks.

## References

- CaseFlow product brief and API contract.