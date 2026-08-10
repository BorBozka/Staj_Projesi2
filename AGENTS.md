# AGENTS.md

# Visitor Management System — Codex Instructions

## Mandatory Reading Order

Before making changes, read:

1. `PRODUCT_SPEC.md`
2. `UI_SPEC.md`
3. `TECH_STACK.md`
4. `DEVELOPMENT_PLAN.md`

These files define the project.

`PRODUCT_SPEC.md` is authoritative for business behavior.

`UI_SPEC.md` is authoritative for interface direction.

`TECH_STACK.md` is authoritative for technology choices.

If older chat/discovery material conflicts with repository documentation, follow the repository documentation.

---

## Fixed Frontend Stack

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Table when table functionality requires it
- React Hook Form for non-trivial forms
- Zod for form/data validation
- date-fns for date/time utilities

Do not replace this stack without explicit user approval.

Do not add Redux.

Do not add Zustand, TanStack Query, Recharts, or a Gantt library until a current requirement actually needs them.

The initial visit timeline should be a focused custom React component, not a general-purpose project-management Gantt implementation.

---

## Development Mode

This project is developed incrementally.

Never implement future phases unless the user explicitly requests them.

When asked to implement one phase:

- implement only that phase,
- do not proactively begin the next phase,
- do not add future backend functionality "for completeness",
- stop when the requested phase is complete.

---

## Requirements Discipline

Do not invent business requirements.

Do not add features merely because they are common in visitor-management software.

If a missing detail would cause a consequential architecture or business-rule decision, ask before making the assumption.

Small implementation details may use reasonable defaults when they do not alter business behavior.

---

## Frontend Rule

The frontend created during UI phases is the real production frontend.

It is not a disposable prototype.

Until backend phases begin:

- use mock data through replaceable service/repository abstractions,
- do not scatter hardcoded mock objects throughout components,
- keep data access isolated,
- keep domain types centralized,
- design service interfaces so real APIs can replace mocks later,
- use in-memory mock mutations only for demonstration of current-phase workflows.

Do not create a fake Express/Node backend during frontend phases unless explicitly requested.

---

## Modularity

Prefer domain-oriented boundaries such as:

- app shell
- organization
- visits
- visitors
- security
- visitor cards
- deliveries
- reporting
- administration
- public pre-registration

Shared components belong in a deliberate shared/common layer.

Avoid circular dependencies between domains.

Avoid a single oversized global state object.

---

## UI Requirements

Follow `docs/UI_SPEC.md`.

Key direction:

- modern
- compact
- minimalist
- enterprise
- desktop-first internally
- mobile-first for public visitor registration
- high information density without clutter
- neutral palette with restrained accent color
- compact tables
- subtle borders and shadows
- role-specific dashboards
- drawers for fast operational actions

Avoid:

- glassmorphism
- excessive gradients
- oversized KPI cards
- decorative dashboards
- excessive charting
- unnecessary animations
- excessive whitespace
- a generic admin-template appearance

---

## Business Rules That Must Not Be Reinterpreted

- Visitor cards are physical numbered cards only.
- Visitor cards are not integrated with Starkom/access-control hardware.
- Security manually performs check-in and check-out.
- No internal approval workflow exists for planned visits.
- Host employee is mandatory for normal visits.
- Rule acceptance is mandatory before check-in.
- National identity number is not required.
- Each individual visitor has a separate visit record.
- Employees may create visits at other companies/facilities.
- Security cannot delete visit records.
- Overdue is calculated, not a permanent stored visit status.
- No overdue email is sent to the host employee.
- Goods delivery is a separate module.
- Gate-only delivery drivers are not visitors.
- Drivers entering the facility must use the visitor process.
- Actual goods-delivery arrival and departure times are tracked.

---

## Phase Completion Report

At the end of every requested phase, stop and provide:

1. Summary of implementation
2. Files changed
3. UI/technical decisions made
4. Known limitations
5. Items that need user/stakeholder review
6. Tests/checks performed

Do not continue to another phase automatically.

---

## Quality

Prefer maintainable code over clever code.

Use:

- clear domain naming
- consistent component structure
- reusable UI primitives
- predictable state management
- TypeScript domain models
- validation close to domain boundaries
- accessible labels and keyboard behavior

Do not over-engineer infrastructure during early UI phases.

Before finishing a phase, run the relevant available checks such as:

- typecheck
- lint
- build
- targeted tests if any exist

Do not claim a check passed if it was not run successfully.
