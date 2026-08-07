# PHASE_1_CODEX_PROMPT.md

Read `AGENTS.md` and all referenced files before making any changes.

Implement **only Phase 1 — Application Shell + Employee UI** from `docs/DEVELOPMENT_PLAN.md`.

If this repository is empty, you may also create the minimum Phase 0 foundation required to implement Phase 1.

Do not proceed beyond Phase 1.

## Fixed Stack

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Hook Form where appropriate
- Zod for form validation
- date-fns for date/time utilities

Do not substitute another frontend stack.

Do not add Redux.

Do not add a backend.

Do not add TanStack Query, Zustand, Recharts, or a Gantt library unless Phase 1 genuinely cannot be implemented cleanly without them. The expected implementation does not require them.

## Phase 1 Scope

Implement:

- production-oriented internal application shell,
- compact collapsible left sidebar,
- compact top bar,
- employee role navigation,
- company/facility context placeholder,
- Employee / My Visits dashboard,
- Day / Week / Month visit timeline,
- upcoming visits list,
- visual states for:
  - Planned
  - Checked In
  - Checked Out
  - Cancelled
  - No Show
- New Visit UI,
- Edit Visit UI,
- Reschedule UI,
- Cancel Visit UI,
- realistic in-memory mock interactions through a replaceable mock service layer,
- reusable shared UI components,
- centralized TypeScript domain types.

## Employee UX

The employee dashboard is primarily a scheduling/planning interface, not an analytics dashboard.

The main visual should be a compact visit timeline.

Do not implement a general project-management Gantt.

Create a focused `VisitTimeline`-style component using normal React/CSS/Tailwind layout primitives.

The timeline must make it easy to understand:

- who is visiting,
- when,
- current visit state.

Cancelled visits remain visible with a clearly cancelled/muted treatment.

Provide Day / Week / Month view controls.

## New Visit Form

The employee-facing visit creation UI should remain compact.

At minimum include:

Visitor:
- first name
- last name
- email

Visit:
- visit type
- host employee
- host company
- facility
- date
- planned start
- planned end

Additional:
- optional note

Business rules:

- host employee is mandatory,
- host company/facility may differ from the employee's own company,
- planned start and end are mandatory,
- end must be after start.

Primary action:

`Send Invitation`

This is mock behavior only in Phase 1.

Do not send real email.

## Mock Architecture

Do not hardcode visit arrays directly in pages/components.

Create centralized domain types and a replaceable service boundary, for example conceptually:

- `VisitService`
- `MockVisitService`

The exact file naming is your choice, but the separation must be clear.

The UI should consume the service abstraction/mock service in a way that can later be replaced with real API calls without redesigning the screens.

Mock create/edit/reschedule/cancel operations should update the current demo state so the stakeholder can interact with the application.

Do not create a fake Node/Express API.

## Visual Direction

Follow `docs/UI_SPEC.md`.

The UI must feel:

- modern,
- compact,
- minimalist,
- enterprise,
- neutral,
- information-dense without clutter.

Use:

- thin borders,
- subtle shadow only where useful,
- restrained radius,
- compact typography,
- one restrained accent color,
- semantic status indicators,
- consistent spacing.

Avoid:

- glassmorphism,
- large gradients,
- oversized KPI cards,
- decorative charts,
- excessive whitespace,
- oversized icons,
- a generic template-dashboard appearance.

## Responsive Direction

Internal UI is desktop-first but should remain usable at tablet widths.

Do not spend Phase 1 building the public mobile visitor registration flow.

That belongs to Phase 3.

## Explicitly Out of Scope

Do not implement:

- backend,
- database,
- real authentication,
- Active Directory,
- email sending,
- QR generation/scanning,
- Security dashboard,
- security check-in/check-out,
- visitor card workflows,
- public visitor pre-registration,
- goods-delivery screens,
- manager reports,
- admin screens,
- Excel/PDF export,
- overdue background monitoring.

Do not create placeholder pages for future modules unless required only to keep routing/navigation coherent.

## Quality Gate

Before declaring Phase 1 complete, run all relevant checks available in the project, including where configured:

- TypeScript typecheck,
- lint,
- production build.

Fix errors caused by your implementation.

## Completion

When Phase 1 is complete, stop.

Do not begin Phase 2.

Report:

1. what you implemented,
2. files changed,
3. UI/technical decisions made,
4. known limitations,
5. items the stakeholder should review,
6. tests/checks performed and their results.
