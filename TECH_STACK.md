# TECH_STACK.md

# Visitor Management System — Technical Stack

## 1. Frontend

The frontend stack is fixed as:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

Supporting libraries:

- TanStack Table — advanced tables, sorting, filtering, pagination, column visibility
- React Hook Form — form state and form workflows
- Zod — client-side schemas and validation
- date-fns — date/time formatting and calculations
- xlsx (SheetJS) — Manager Reports Excel export
- jspdf + jspdf-autotable — Manager Reports PDF export
- Recharts — limited manager/reporting charts (Manager Reports' Ziyaretler tab daily trend chart)

CSV export uses the native Blob/download APIs and does not require a dedicated library.

Libraries that may be added later only when an actual requirement appears:

- TanStack Query — server-state/API data fetching after backend integration begins
- Zustand — only if genuine cross-screen client state becomes difficult to manage with local state/context

Do not add Redux by default.

Do not add a full Gantt/charting library during the initial UI phases.

The employee visit timeline should initially be implemented as a focused custom React component using normal layout primitives such as CSS Grid/Flexbox.

---

## 2. Frontend Architecture

The frontend is the production frontend, even during mock-data phases.

Do not treat early UI work as disposable prototyping.

Use:

- centralized domain types,
- domain-oriented feature folders,
- replaceable service interfaces,
- mock implementations behind service boundaries,
- shared UI primitives,
- role-aware routing/navigation.

Do not:

- scatter mock data inside screen components,
- tightly couple components to mock implementations,
- create a fake backend unless specifically requested,
- add infrastructure before it is needed.

A later real API should replace mock services without requiring the UI to be rewritten.

---

## 3. Styling

Use Tailwind CSS for layout, density, spacing, responsive behavior, and design tokens.

Use shadcn/ui as the component foundation.

shadcn/ui components may be adapted to match the application's compact enterprise design.

Do not preserve default component spacing if it conflicts with the UI specification.

Avoid adopting another visually dominant UI framework such as Material UI unless the project requirements change.

---

## 4. Backend Direction

The intended backend direction is:

- ASP.NET Core Web API

This will be implemented only after the UI review/freeze phases.

The backend will expose APIs consumed by the React application.

---

## 5. Database Direction

The intended relational database is:

- Microsoft SQL Server

The detailed schema must be derived from the approved product model and later backend phases.

Do not create the production database during UI-only phases.

---

## 6. Enterprise Integrations

Planned integrations include:

- Active Directory for applicable users and organization attributes
- local application users
- SMTP/email delivery
- QR/token-based visitor lookup

Visitor cards are not electronically integrated with Starkom or another physical access-control platform.

---

## 7. Deployment Direction

Expected production direction:

Frontend:
- Vite production build
- static files served by IIS or equivalent web hosting

Backend:
- ASP.NET Core application
- hosted on the organization's server environment

Database:
- Microsoft SQL Server

Final deployment decisions may be adjusted to the organization's infrastructure later.

---

## 8. Dependency Discipline

Do not install a dependency merely because it may be useful later.

Before adding a new dependency, determine whether:

1. the current requested phase actually needs it,
2. the capability cannot be reasonably achieved with the existing stack,
3. the dependency will not unnecessarily constrain the design.

Keep the dependency set small and intentional.
