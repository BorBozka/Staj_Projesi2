# DEVELOPMENT_PLAN.md

# Visitor Management System — Development Plan

## Development Philosophy

The project is implemented incrementally.

Each phase must be:

1. implemented,
2. reviewed,
3. corrected if necessary,
4. explicitly approved,

before the next phase begins.

Do not implement future phases proactively.

The initial focus is UI so stakeholders can review the product early.

The frontend built in these phases is production-oriented and will be retained.

Mock data must be provided through replaceable service boundaries.

---

## Approved Refinement — Meeting–Visit Frontend / Mock Service

Goal:

Introduce the approved Meeting grouping model without changing the visitor-based
operational screens or starting backend/resource lifecycle work.

Includes:

- a central `Meeting` domain model as the single source of shared visit information,
- a required `meetingId` on every `Visit`,
- deterministic one-to-one Meeting records for existing single-visitor mock Visits,
- creation of one Meeting and one separate Visit per visitor in a single operation,
- a compact multi-visitor New Visit form with shared fields shown once,
- Visit-based invitation delivery results and individual retry,
- individual Visit cancellation and bulk cancellation of only cancellable Visits in a
  Meeting,
- combined service projections for existing visitor-based timelines, security lists,
  notifications, and manager `All Visits`.

The manager `All Visits` table, security lists, employee timeline, and notifications keep
one record per visitor. Existing filtering, sorting, pagination, URL synchronization,
details, and Visit-based overdue behavior must remain intact.

Does not include:

- backend, API, database, or persistent storage,
- resource catalogue, assignment, availability, or conflicts,
- Meeting end/close/extension/status lifecycle,
- Meeting source/integration lifecycle,
- redesign or Meeting-grouped UI for `All Visits`.

Acceptance:

- one visitor creates one Meeting and one Visit,
- several visitors create distinct Visits with the same `meetingId`,
- updating a shared Meeting field is reflected in every linked Visit projection,
- Visit and Meeting cancellation follow existing Visit-state restrictions,
- bulk invitation results are stored independently per Visit and failures can be retried,
- Security cannot see the additional-requirement description,
- existing manager table behavior and project checks continue to pass.

Stop after this refinement and request review. Do not continue to resources or the full
Meeting lifecycle.

---

## Approved Phase — Resource Catalog Frontend / Mock Service

Goal:

Allow Manager users to maintain facility meeting rooms, pooled equipment, individual
vehicles, and individual drivers without starting resource assignment or reservation
behavior.

Includes:

- central discriminated-union `ROOM`, `POOLED_EQUIPMENT`, `VEHICLE`, and `DRIVER`
  resource catalog domain types,
- company/facility validation against existing organization reference data,
- replaceable mock-service list, create, update, and active/inactive operations,
- deterministic room, equipment-pool, vehicle, and driver seed data across multiple
  facilities,
- Manager navigation and a compact responsive catalog page,
- combined company, facility, type, and active-state filters,
- create/edit validation where quantity applies only to pooled equipment; vehicles require
  separate brand/model/license-plate fields and drivers require full name plus at least one
  license class,
- loading, error, empty, and filtered-empty states,
- service and filtering tests that protect existing Meeting and Visit behavior.

Does not include:

- Meeting resource assignment or participant-level resource fields,
- vehicle-driver assignment or permanent/default driver relationships,
- reservation, availability, conflict, override, release, or alternatives,
- notification, audit history, backend, API, database, or persistence.

Acceptance:

- Managers can list, create, and edit all four valid resource types,
- rooms, vehicles, and drivers have no quantity and equipment pools require a positive
  whole-number quantity,
- vehicle brand/model/license plate remain separate fields and drivers retain license
  classes, optional textual documents, and explicit commercial-vehicle capability,
- company/facility mismatches are rejected at the service boundary,
- resources can be deactivated and reactivated without deletion,
- filters work together and the page reflows without page-level horizontal overflow,
- catalog operations do not change Meetings, Visits, invitations, or cancellations.

Stop after the catalog and request review. Do not continue to assignment, availability,
conflicts, Meeting lifecycle, or resource notifications.

---

# Track A — UI / UX First

## Phase 0 — Frontend Foundation

Goal:

Create the minimum foundation needed for production-oriented UI development.

Required stack:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

Add supporting dependencies only when needed by the current work.

Includes:

- Vite React TypeScript project if repository is empty,
- Tailwind setup,
- shadcn/ui setup,
- routing foundation,
- global design tokens/styles,
- shared UI primitives,
- feature/domain folder structure,
- centralized domain types,
- replaceable mock service layer,
- lightweight development-only role/context simulation where needed.

Does not include:

- backend,
- database,
- real authentication,
- Active Directory,
- real email,
- QR generation,
- persistent storage.

Acceptance:

- application runs,
- architecture is ready for modular UI work,
- mock services are replaceable,
- no future business modules are prematurely implemented.

Phase 0 may be implemented as part of Phase 1 when starting from an empty repository.

---

## Phase 1 — Application Shell + Employee UI

Goal:

Produce the first stakeholder-demoable interface.

Includes:

- internal application shell,
- compact collapsible sidebar,
- compact top bar,
- employee role navigation,
- company/facility context placeholder,
- Employee / My Visits dashboard,
- Day / Week / Month visit timeline,
- upcoming visits list,
- visit status visuals,
- New Visit UI,
- Edit Visit UI,
- Reschedule UI,
- Cancel Visit UI,
- mock state and mock service interactions.

Timeline:

- should be visit-specific and Gantt-like,
- should initially be custom-built using React/CSS layout,
- should not introduce a heavy Gantt dependency.

Forms:

- use React Hook Form + Zod when appropriate.

Dates:

- use date-fns.

Important:

- cancelled visits remain visible,
- no backend,
- no real email,
- no real QR,
- no real authentication.

Acceptance:

- employee can navigate the interface,
- employee can create/edit/reschedule/cancel visits using mock state,
- timeline displays visits clearly,
- UI matches `UI_SPEC.md`,
- build/typecheck/lint succeed where configured,
- interface is ready for management review.

Stop after Phase 1 and request review.

---

## Phase 2 — Security UI

Includes:

- Security dashboard,
- Expected / Inside / Overdue / Completed tabs,
- visitor/QR search UI,
- unplanned visitor UI,
- visitor right-side drawer,
- editable permitted visitor fields,
- visitor card selection,
- mock Check In,
- mock Check Out,
- Card Returned / Not Returned flow,
- overdue persistent alert simulation.

Use TanStack Table if the visitor table requires sorting/filtering/column behavior that justifies it.

No real persistence or QR scanning is required yet.

Acceptance:

- key security workflows can be demonstrated end-to-end using mock services.

Stop and request review.

---

## Phase 3 — Visitor Pre-registration UI

Includes:

- public/mobile-first invitation page,
- visit summary,
- visitor information completion,
- vehicle yes/no,
- conditional plate field,
- rules display,
- explicit rule acceptance,
- confirmation screen,
- mock QR representation.

No real email or backend token validation yet.

Acceptance:

- pre-registration flow is fully demonstrable on desktop and mobile.

Stop and request review.

---

## Phase 4 — Goods Delivery UI

Includes:

- employee goods-delivery creation,
- expected delivery list,
- security delivery view,
- Expected / Arrived / Completed status,
- gate-only vs facility-entry indication,
- mock arrival/departure operations.

Acceptance:

- after-hours delivery workflow is demonstrable.

Stop and request review.

---

## Phase 5 — Manager and Reports UI

Includes:

- manager dashboard,
- initial KPI cards,
- report filter bar,
- report table,
- Excel/PDF buttons as UI actions,
- multi-company/facility context using mock data,
- at most a small number of useful charts.
- read-only `All Visits` operations list with URL-persisted date-range and manager filters,
- compact pagination and a right-side visit detail drawer,
- invitation and additional-requirement visibility without meeting or resource-assignment actions.

Recharts may be added only if actual stakeholder-reviewed charts are needed.

Acceptance:

- managers can navigate overview and reporting using mock data.

Stop and request review.

---

## Phase 6 — Admin UI

Includes:

- Users
- Companies
- Facilities
- Security Gates
- Visit Types
- Visitor Cards
- Visitor Rule Versions
- System Settings

Settings include:

- overdue tolerance,
- overdue alert repeat interval.

Acceptance:

- all configuration modules use a consistent management pattern.

Stop and request review.

---

## Phase 7 — UI Review and Freeze

Goal:

Review the entire frontend with stakeholders before backend implementation.

Activities:

- remove unnecessary screens,
- adjust fields,
- validate role workflows,
- validate multi-company/facility navigation,
- validate security speed/clarity,
- validate mobile pre-registration,
- normalize visual inconsistencies,
- confirm responsive behavior,
- confirm final screen inventory.

Output:

- approved frontend flows,
- approved screen inventory,
- approved field inventory,
- approved interaction model.

No production backend implementation begins until this phase is approved.

---

# Track B — Functional Implementation

## Phase 8 — Backend Foundation + Authentication and Users

Intended stack:

- ASP.NET Core Web API
- Microsoft SQL Server

Includes:

- backend solution foundation,
- database foundation and migrations,
- user persistence,
- local authentication,
- role enforcement,
- Active Directory integration foundation,
- user-to-company/department relationships.

At this point TanStack Query may be introduced on the frontend if useful for real server-state management.

---

## Phase 9 — Organization Module

Includes persistence and APIs for:

- companies,
- facilities,
- security gates,
- departments as required,
- cross-company visit targeting,
- facility permissions/context.

---

## Phase 10 — Visitor and Visit Backend

Includes:

- Visitor entity,
- Visit entity,
- visit statuses,
- planned visit creation,
- reschedule,
- cancellation,
- returning visitor lookup,
- host relationship,
- planned time validation,
- no-show logic.

---

## Phase 11 — Security Check-in / Check-out and Card Backend

Includes:

- card inventory,
- card state rules,
- check-in,
- check-out,
- card return,
- card not returned,
- inside visitor queries,
- security corrections.

---

## Phase 12 — Rules and Pre-registration Backend

Includes:

- invitation token,
- visitor public form,
- rule versions,
- immutable acceptance records,
- visitor information update,
- visit lookup via token,
- QR token generation/validation.

---

## Phase 13 — Email Notifications

Includes:

- invitation email,
- visitor check-in email to host.

Does not include host overdue email.

---

## Phase 14 — Overdue Monitoring

Includes:

- overdue calculation,
- configurable tolerance,
- configurable alert repeat interval,
- security alert delivery logic,
- no-show distinction.

---

## Phase 15 — Goods Delivery Backend

Includes:

- expected deliveries,
- actual arrival,
- actual departure,
- delivery statuses,
- gate-only/facility-entry handling,
- optional visitor relationship when driver enters facility.

---

## Phase 16 — Reporting and Export

Includes:

- reporting queries,
- filters,
- Excel export,
- PDF export,
- multi-company/facility filtering.

---

## Phase 17 — Hardening and Validation

Includes:

- authorization review,
- input validation,
- security review,
- error handling,
- logging,
- performance review,
- accessibility review,
- migration/seed strategy,
- stakeholder acceptance testing.

---

# Phase Control Rule

Codex must not start a future phase unless explicitly requested.

When a phase is completed, Codex must stop and report:

- what was implemented,
- files changed,
- key decisions,
- known limitations,
- items requiring review,
- tests/checks performed.

No "while I was here" implementation of future phases.
