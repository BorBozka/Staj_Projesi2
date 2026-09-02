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

## Current Closure Sequence

Security Operations UI/polish is **complete**. The `Expected` and `Inside` operational
workspace, gate correction, check-in/check-out and card-return flows are frozen except for
targeted defects.

The closure order is fixed as follows:

1. **Unplanned visit** — complete: Security creates and immediately checks in a one-visitor
   visit from the current company/facility scope, with an available card and desk rule
   acceptance. Duration choices include fixed intervals, until noon, and until the configured
   workday end (`18:15` by default).
2. **Security Goods Movements** — complete: Security lists today's scoped planned inbound and
   outbound goods movements, searches operational fields, and records scoped arrivals/departures
   with optional actual plate/driver details.
3. **Authentication UI** — complete:
   - shared `/login`, mock `LOCAL` demo authentication, browser-session hydration, role-based route guards, role-home redirects, and real mock logout are complete,
   - all role shells read their account menu profile from the current session; `LOCAL` password changes update the in-memory mock credential store for the active browser runtime.
4. **Backend + MSSQL + LOCAL authentication** — pending.
5. **Active Directory integration** — not in this project's implementation scope. A customer may integrate it in its own environment when needed.
6. **Mock service → real API adaptation** — pending.
7. **Authorization/scope enforcement** — pending.
8. **Regression/E2E tests** — pending.
9. **Final merge/deploy check** — pending.

No item in this order authorizes implementation of a later item without an explicit request.

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
- replaceable mock-service list, create, update, active/inactive, and hard-delete operations,
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
- resources can be deactivated/reactivated or permanently deleted as separate operations,
- deletion is confirmed in the edit dialog and applies to all four catalog resource types,
- deleted rooms/equipment cannot be assigned again, while immutable assignment snapshots
  preserve historical Meeting assignment details without cascade deletion,
- filters work together and the page reflows without page-level horizontal overflow,
- catalog operations do not change Meetings, Visits, invitations, or cancellations.

Stop after the catalog and request review. Do not continue to assignment, availability,
conflicts, Meeting lifecycle, or resource notifications.

---

## Approved Phase — Manager Resource Assignment Frontend / Mock Service

Goal:

Enable Manager users to assign, update, and remove facility meeting rooms (`ROOM`) and pooled equipment (`POOLED_EQUIPMENT`) for Meetings via a replaceable service abstraction and a centered, tabbed Manager Visit Detail dialog.

Includes:

- Domain models and assignment abstractions in `src/domain/resources.ts`:
  - `RoomAssignment`, `EquipmentAssignment`, `ResourceAssignment`, `ResourceAssignmentView` (projected view enriched with catalog metadata).
  - `DesiredResourceState` (`{ roomResourceId: string | null, equipment: { resourceId: string, requestedQuantity: number }[] }`).
  - `RoomAvailabilityInfo`, `EquipmentAvailabilityInfo`.
- Service interface `ResourceAssignmentService` in `src/services/resource-assignment-service.ts` and mock implementation `MockResourceAssignmentService` in `src/services/mock-resource-assignment-service.ts`:
  - `listAssignmentsForMeeting(meetingId)`
  - `assignRoom(meetingId, input)`
  - `assignEquipment(meetingId, input)`
  - `updateEquipmentAssignment(assignmentId, requestedQuantity)`
  - `removeAssignment(assignmentId)`
  - `getEligibleRooms(meetingId)`
  - `getEligibleEquipment(meetingId)`
  - `saveMeetingAssignments(meetingId, desired)`: Atomic save operation validating Meeting status, facility matching, active status, room conflict, equipment capacity limits, positive quantities, and unique equipment IDs before committing state.
- `isMeetingCompleted` helper function identifying terminal meetings (where all visits are `CHECKED_OUT`, `CANCELLED`, or `NO_SHOW`).
- UI Components:
  - `MeetingResourcePanel` (`src/features/resources/MeetingResourcePanel.tsx`): Renders room and pooled equipment sections, inline room picker with conflict reasons, inline equipment picker with availability counters and stepper controls, local working draft state (`persistedDraft` vs `draft`), sticky unsaved changes footer bar ("Kaydedilmemiş değişiklikler", "Kaydet", "Vazgeç"), error banner handling, and read-only mode for completed meetings.
  - `ManagerVisitDetailsDialog` (`src/features/manager/ManagerVisitDetailsDialog.tsx`): A centered compact dialog shared by Dashboard and All Visits. It keeps restrained tabs, assigned count, dirty indicator, CSS `hidden` tab toggling, and the unsaved-resource close guard.
- Comprehensive unit test coverage in `src/services/mock-resource-assignment-service.test.ts`.

Does not include:

- Fleet vehicle (`VEHICLE`) or driver (`DRIVER`) meeting assignment,
- Conflict override mechanisms or automated employee notifications,
- Backend API, database persistence, or real server integrations.

Acceptance:

- Managers can view, assign, edit, and remove rooms and equipment for any Meeting that is not completed.
- At most 1 room can be assigned per meeting (atomic replacement).
- Equipment assignments enforce positive integer quantities and total pool capacity limits across overlapping non-cancelled meetings.
- All resource modifications for a meeting are validated and persisted atomically via `saveMeetingAssignments`.
- Local draft editing supports Kaydet/Vazgeç and blocks the centered dialog close via confirmation when unsaved changes exist.
- Completed meetings (`CHECKED_OUT`, `CANCELLED`, `NO_SHOW`) and explicitly closed Meetings (`actualMeetingEnd` set) render in read-only mode and reject modifications at the service layer.
- Unit tests (`mock-resource-assignment-service.test.ts`) pass cleanly.

---

## Approved Phase — Meeting Lifecycle Frontend / Mock Service

Goal:

Allow a Meeting's host employee to extend or manually close it while it is in progress,
track the actual close time and its source, derive a signed end-time variance for
display, and automatically close the Meeting when the last checked-in visitor
checks out.  Resource availability (room conflict, equipment capacity) is
re-validated on every extension; a conflict causes the extension to be rejected
entirely.

Approved business rules:

- Meeting does not auto-close when `plannedEnd` passes.
- Manual lifecycle permission is identity-based:
  `currentEmployee.employeeId === meeting.hostEmployeeId`; Manager role and creator
  identity alone do not grant permission.
- Manual lifecycle eligibility requires host identity, current time at or after
  `plannedStart`, no `actualMeetingEnd`, and at least one non-terminal linked Visit.
- Lifecycle action buttons (+15 dk, +30 dk, custom, close) are exposed only in the My
  Visits floating notification after `plannedEnd` arrives or passes.
- Extension formula: `newPlannedEnd = max(current plannedEnd, current time) + extensionMinutes`
- Extension input is a positive whole-number minute count.
- Extension is validated against all existing ROOM and POOLED_EQUIPMENT assignments
  for the new time range; any conflict or capacity violation rejects the entire
  extension (no partial persistence, no override, no alternative suggestion).
- `actualMeetingEnd` is written when the Meeting is closed.
- `meetingEndSource` is `MANUAL` (host) or `VISITOR_CHECK_OUT` (auto-close).
- End-time variance is `actualMeetingEnd − plannedEnd` in whole minutes (signed,
  derived — not stored).
- Auto-close fires only when a checkout leaves zero CHECKED_IN visitors remaining
  AND the Meeting has not already been explicitly closed.
- A closed Meeting (`actualMeetingEnd` set) is immediately read-only for resource
  assignments, independent of whether all visits are in terminal states.
- The existing `isMeetingCompleted` helper (all-visits-terminal) is kept separate
  and continues to gate resource mutations as before.
- A closed Meeting is excluded from room-conflict and equipment-capacity
  calculations; its assignment records are preserved for auditing.
- Security UI is out of scope for this phase; `checkoutVisit` domain/service logic
  is prepared but not surfaced in Security screens.
- My Visits timeline and Upcoming Visits remain creator-scoped. A separate persistent
  host-scoped notification lists manually actionable hosted Meetings whose `plannedEnd`
  has arrived or passed without adding their Visits to either personal surface. Fully
  terminal Meetings are excluded even when legacy/mock data lacks `actualMeetingEnd`.

Includes:

- Domain (`src/domain/visits.ts`): `meetingEndSources`, `MeetingEndSource`,
  `actualMeetingEnd?` and `meetingEndSource?` on `MeetingDetails` (projected into
  `Visit`), `ExtendMeetingInput`, `CloseMeetingInput`.
- Utility (`src/lib/meeting-lifecycle.ts`): `isMeetingExplicitlyClosed`,
  `isMeetingOvertime`, `computeMeetingEndVarianceMinutes`, `computeExtendedPlannedEnd`,
  shared terminal/resource-read-only predicates, manual lifecycle eligibility, host
  authorization, and overdue-hosted-Meeting selection.
- Service interface extensions (`src/services/visit-service.ts`):
  `extendMeeting`, `closeMeeting`, `checkoutVisit`.
- Service interface extension (`src/services/resource-assignment-service.ts`):
  `validateExtension`.
- Mock visit service (`src/services/mock-visit-service.ts`):
  implementations of `extendMeeting`, `closeMeeting`, `checkoutVisit`,
  `setResourceAssignmentService` setter to break circular dependency,
  `projectVisit` updated to include lifecycle fields.
- Mock resource assignment service (`src/services/mock-resource-assignment-service.ts`):
  `assertMeetingResourcesMutable` (replaces `assertMeetingNotCompleted` — now
  checks both explicit closure and all-visits-terminal conditions),
  `isMeetingClosedOrCancelled` helper (closed meetings excluded from availability),
  `validateExtension` implementation.
- Services wiring (`src/services/index.ts`): circular dependency resolved via
  `setResourceAssignmentService`.
- Seed data (`src/services/mock-visit-data.ts`): four lifecycle demo meetings
  (active/in-progress, overtime, closed-MANUAL, closed-VISITOR_CHECK_OUT).
- Manager detail UI (`src/features/manager/ManagerVisitDetailsDialog.tsx`): one centered,
  compact dialog shared by Dashboard and All Visits, with visit details and Meeting resource
  assignment tabs. It intentionally does not expose Meeting lifecycle information or actions,
  including when the current Manager is the Meeting host.
- Employee UI (`src/features/visits/HostedMeetingEndNotifications.tsx`): one compact,
  lower-right fixed and minimizable `İşlem gerekenler` panel with a total count and
  internally scrollable Meeting and invitation groups. It keeps host-only
  +15/+30/custom/close actions for overdue, manually actionable hosted Meetings and routes
  creator-scoped `NOT_SENT`/`FAILED` Visit actions to the existing single-Visit invitation
  dialog.
- Shared lifecycle actions (`src/features/visits/MeetingLifecycleActions.tsx`): keeps quick
  actions in one stable row, presents custom minutes in an anchored popover, and performs
  MANUAL close without a confirmation dialog.
- Manager dashboard (`src/features/manager/ManagerDashboard.tsx`): makes `Sıradaki
  Ziyaretler` rows open the existing `ManagerVisitDetailsDialog` while preserving the
  `Tümünü gör` route.
- Unit tests: `src/lib/meeting-lifecycle.test.ts`,
  `src/services/mock-meeting-lifecycle-service.test.ts`,
  `src/services/mock-resource-assignment-service.test.ts` (updated to wire
  `setResourceAssignmentService`).

Does not include:

- Security UI check-in / check-out screens,
- Recurring popup/escalation or overdue email related to Meeting lifecycle,
- Backend, API, database, or persistence.

Acceptance:

- Lifecycle management remains host-scoped in My Visits notifications; Manager detail UI
  does not expose lifecycle information or actions.
- +15 dk and +30 dk extend `plannedEnd`; custom entry accepts a positive integer.
- Extension with a ROOM or POOLED_EQUIPMENT conflict shows an error banner and
  makes no change.
- "Toplantıyı Bitir" immediately closes the Meeting, sets source to `MANUAL`, and removes
  its floating notification; close time, source, and signed variance remain in the Meeting
  domain projection.
- Closed meetings are read-only for resource assignment (both from service-layer
  error and UI read-only mode).
- A closed meeting does not consume room or equipment capacity.
- Existing `isMeetingCompleted` all-visits-terminal guard remains intact.
- My Visits keeps its existing creator-scoped calendar/upcoming data and independently
  removes a host notification after extension until the new end, or after Meeting close.
- Service tests reject non-host Manager and non-host creator actors, future Meetings, and
  fully terminal Meetings for manual lifecycle mutations while preserving
  `VISITOR_CHECK_OUT` automatic close.
- `AllVisitsPage` one-row-per-Visit behavior, filtering, sorting, and pagination
  are unaffected.
- TypeScript typecheck, lint, unit tests, and build pass.

---

## Approved Feature — Planned Vehicle and Driver Assignment Frontend / Mock Service

Goal:

Allow Managers to create, edit, cancel, and view standalone planned vehicle-and-driver assignments using
the existing Resource Catalog records, without changing Meeting resource assignment.

Includes:

- centralized planned transport assignment domain models with immutable vehicle/driver display snapshots,
- replaceable mock transport-assignment service with list, availability, create, update, and cancel operations,
- service-boundary validation for required fields, company/facility scope, active catalog state,
  optional paired start/end times, full-day reservation conflicts, optional Meeting-or-Visit
  link scope, and overlapping active assignments,
- a compact Manager planning page with an initially blank create-only planning context,
  instructional availability state, selected-time available vehicles/drivers, contextual
  filtering, and a three-record fixed-height paginated upcoming-assignment list whose clickable
  rows open detail-dialog edit/cancel controls,
- Manager navigation/route integration plus compact Dashboard Fleet integration: current tasks in
  `Şu Anda Aktif` and today's vehicle event markers in the existing operation chart,
- unit coverage for availability, overlap, scope, active-state, optional-link, self-excluded edit,
  cancellation release, and isolation behavior,
- horizontal centering for the existing unsaved-resource confirmation dialog actions.

Does not include:

- Security unplanned assignment UI,
- odometer input or monthly kilometre reporting,
- permanent vehicle-driver pairings, overrides, notifications, backend, or persistence,
- changes to Meeting room/equipment resource assignments.

Acceptance:

- A Manager can create an assignment with company, facility, date, task/purpose, exactly one
  available vehicle, and exactly one available driver. Planned start/end times are supplied
  together or omitted together; an untimed assignment reserves both resources for the full day.
- A selected Meeting or Visit is optional; when present it must match the assignment scope.
- Inactive, out-of-scope, or overlapping resources are omitted from availability and rejected by
  the service even if a caller bypasses the UI.
- Availability remains instructional until all planning-context fields are present; cancelled
  assignments do not consume either resource and cannot be edited.
- The page clearly shows selected-time availability plus upcoming/contextual assignments without
  adding dashboard KPIs. Editing stays inside the assignment detail dialog and the upper card
  continues to create new assignments only. The existing Dashboard can show active Fleet tasks and today's Fleet
  event markers without changing visit, delivery, or bar-chart semantics.
- Existing Meeting resource assignments remain unchanged.
- TypeScript typecheck, lint, relevant unit tests, and build pass.

Stop after this feature and request review before commit, push, PR, or merge.

---

## Approved Feature — Manager Goods Movement Frontend / Mock Service

Goal: add a compact Manager-only initial goods inbound/outbound module backed by a replaceable
in-memory service, while reusing its records for existing Dashboard delivery markers.

Includes:

- one centralized `GoodsMovement` model with direction, required planned date, optional planned time,
  actual timestamps, and derived late state,
  optional reference/note, and Security-owned optional plate/driver fields,
- mock list/create/update/cancel service validation for required fields and company/facility scope,
- Manager route, sidebar item, filters, compact table, adaptive direction label, detail dialog, and
  planned-only edit/cancel actions,
- Dashboard migration from the standalone delivery mock to today's planned goods movements,
  retaining the marker and visit-bar interaction model,
- targeted service and Dashboard utility tests.

Does not include Security completion UI, plate/driver entry UI, depot/ERP fields, backend, or persistence.

Acceptance: Managers can create and manage planned inbound/outbound records with a required date and
optional time; completed records remain read-only; `Gecikti` is derived only when a time is supplied;
Dashboard markers distinguish only time-scheduled records; visit and Fleet behavior remains unchanged.

Stop after this feature and request review before commit, push, PR, or merge.

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
- compact pagination and a centered Manager Visit Detail dialog,
- invitation and additional-requirement visibility, with the centered dialog tabbed for visit details and Meeting resource assignment.

Recharts may be added only if actual stakeholder-reviewed charts are needed.

**Manager Reports: functionally complete for all three tabs.** A tabbed `Raporlar` page exists
with a shared date-range/company/facility filter bar (URL-persisted) above the tabs. All three
tabs are implemented and enabled:

- `Ziyaretler` — report KPI cards, an export-ready read-only table, and CSV/Excel/PDF export,
  reusing the All Visits filter/sort core without changing All Visits itself.
- `Araç/Şoför` — reads `PlannedTransportAssignment` (planned data only; no actual start/end or
  odometer capture yet), with its own KPI cards (total assignments, cancelled, cancellation
  rate, average planned duration), a read-only table, and CSV/Excel/PDF export. Reuses the
  shared filter bar, KPI card, and export infrastructure introduced for the `Ziyaretler` tab.
- `Mal Hareketi` — reads `GoodsMovement`, with its own KPI cards (total, inbound, outbound,
  late rate) and the same read-only table + export pattern.

Both new tabs are salt-okunur (read-only): no row click, no detail dialog.

Next steps for this phase:

- A vehicle distance/km report is a separate follow-on mini-phase, gated on Security completion
  and odometer capture landing first (it depends on odometer readings that do not exist yet).
- Visual polish and cross-tab consistency pass (spacing, empty/loading states, KPI hint
  formatting) is intentionally deferred to a single dedicated "UI polish" pass once every Reports
  tab is functionally complete, aligned with the Phase 7 UI Review and Freeze normalization work
  rather than done piecemeal per tab.

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

# Track B — Backend Delivery

The numbered backend outline below is retained only as historical context and is superseded by
the five backend phases in this section.

## Backend Phase 1 — Foundation, MSSQL schema, LOCAL auth and password change

**Status: Complete.**

Includes the separate Node.js/TypeScript/Fastify service, Prisma SQL Server schema, LOCAL user
persistence model, opaque HttpOnly server sessions, role middleware, development-only demo seed
definitions, password change endpoint, and contract documentation. Frontend mock services remain
the active UI data source.

Active Directory integration is explicitly outside this phase. `authenticationSource` remains in
the schema only as a future compatibility boundary; the login endpoint accepts LOCAL users only.

---

## Backend Phase 2 — Organization, admin, operational settings, and resource catalog APIs

**Status: Complete.**

Implements HTTP APIs for organization hierarchy, admin users and authorization scopes,
singleton operational settings, and resource catalog management.

---

## Backend Phase 3 — Visit types, meetings, visits, invitations, security, cards, and rules APIs

**Status: Complete.**

Implement visit types, Meeting/Visit workflows, invitations and pre-registration, Security desk
operations, visitor-card transitions, host-correction audits, and immutable visitor-rule
acceptance APIs. Invitation delivery uses the reusable log/SMTP boundary, stores only hashed
opaque tokens, and sends host check-in notifications as a post-transaction side effect.

---

## Backend Phase 4 — Goods, transport, resource assignments, and reporting data APIs

**Status: Complete.**

Implement goods movements, vehicle/driver and Meeting resource assignments, and reporting data
endpoints while retaining the approved frontend domain semantics.

---

## Backend Phase 5 — Frontend HTTP adapters, authorization integration, and regression/E2E

**Status: Complete.**

The frontend now runs entirely against the Fastify/MSSQL backend — `src/services/index.ts`
instantiates only `Http*` adapters and there is no silent mock fallback; a backend that cannot
be reached surfaces an error, never seed data. The `Mock*` implementations remain in the tree
solely as unit/component test fixtures.

Delivered:

- **Central HTTP client** (`src/lib/http`): `VITE_API_BASE_URL`-driven base URL,
  `credentials: "include"`, query serialization, `204` handling, one typed `ApiClientError`
  model for every backend `{ error: { code, message } }` and every transport failure (5xx
  detail is scrubbed), a 401 hook for the session layer, and no automatic retry of mutations.
- **HTTP adapters** behind the existing service interfaces: Session, Account, Admin, Visit,
  Security, GoodsMovement, ResourceCatalog, ResourceAssignment, TransportAssignment, plus a new
  `ReportsService` boundary over `/api/reports/*`. Server DTOs are mapped to the frontend
  domain model (nested `Visit.meeting` flattened, `hostEmployeeId → ""`, lookup timestamps and
  the rule-acceptance id dropped, a neutral `currentEmployee` synthesised for an Admin session).
  Frontend `userId` / `actingUserId` / `creatorEmployeeId` are never sent — the backend derives
  the actor from the session. Password change is real; avatars stay a client-side
  `localStorage` preference.
- **Server-side authorization / scope enforcement** (`server/src/lib/authorization.ts`):
  `AccessContext` built from the session, `scopeAllows` / `resolveScopeFilter` /
  `matchesScopeFilter`. `companyId=all` / `facilityId=all` resolve to the caller's assigned
  scope, never a global bypass. `listMeetings` / `listVisits` / reference data are role- and
  scope-aware (EMPLOYEE sees only meetings it created or hosts; MANAGER/ADMIN their full scope;
  SECURITY its operational, in-scope subset). Meeting/visit mutations require the meeting in
  scope and, for EMPLOYEE/MANAGER, ownership; ADMIN may mutate any in-scope meeting; host
  lifecycle stays host-identity gated. Reports, goods, resource assignments, transport
  assignments and the resource catalog all scope-filter reads and reject cross-scope mutations.
  An out-of-scope entity id is reported as `404`, an owned-by-another in-scope meeting as `403`.
- **Hardening**: a reusable strict `YYYY-MM-DD` calendar-date validator
  (`server/src/lib/calendar-date.ts`) used by goods `plannedDate` and reports `startDate`/
  `endDate` (`2026-02-31` is now rejected); `DELETE /api/resources/:id`; an
  `AUTH_RATE_LIMIT_MAX` env knob.
- **Tests**: HTTP client + adapter unit tests; a `phase5.authz.mssql.smoke` authorization
  matrix against MSSQL; strict-date regressions; a two-company demo seed (idempotent) so
  cross-scope behaviour is testable; a Playwright browser E2E suite (`pnpm e2e`) over the real
  Vite build + Fastify + MSSQL + cookie sessions covering login/role routing, employee visit
  creation, manager scoped read + mutation denial, admin CRUD, security check-in/out + unplanned
  + goods completion, resource/transport save/cancel, the three report tabs, and post-logout
  route protection.

Known follow-ups: `pnpm lint` still reports the 28 pre-existing errors this branch inherited
(server `any`, `ManagerShell` conditional hooks) — none introduced by Phase 5;
`/api/organization` reads are ADMIN-only but not scope-filtered, so an admin manages the whole
org tree (the alternative would make the second seed company unmanageable).

---

## Legacy backend outline (superseded)

## Phase 8 — Backend Foundation + MSSQL + LOCAL Authentication and Users

Intended stack:

- ASP.NET Core Web API
- Microsoft SQL Server

Includes:

- backend solution foundation,
- database foundation and migrations,
- user persistence,
- local authentication,
- role enforcement,
- user-to-company/department relationships.

Active Directory integration is explicitly outside this project's implementation scope. The
authentication-source model remains extensible so an organization can add its own integration in
a later, separately approved delivery.

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
