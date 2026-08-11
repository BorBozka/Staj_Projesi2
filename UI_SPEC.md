# UI_SPEC.md

# Visitor Management System — UI / UX Specification

## 1. Direction

Use a:

**modern, compact, minimalist enterprise interface**

The desired balance:

- mature enterprise information density,
- modern SaaS clarity,
- restrained styling,
- fast operational usability.

Do not create:

- a legacy ERP/Windows form look,
- a decorative consumer dashboard,
- glassmorphism,
- a marketing-page aesthetic.

---

## 2. Visual System

Use:

- neutral backgrounds,
- dark readable text,
- thin borders,
- subtle shadows,
- restrained border radius,
- compact tables,
- compact controls,
- consistent typography,
- one restrained accent color,
- semantic colors for status.

Avoid:

- large gradients,
- oversized KPI cards,
- oversized icons,
- excessive whitespace,
- decorative charts,
- unnecessary animation,
- visually noisy components.

---

## 3. Density

Operational desktop screens should expose useful amounts of information.

On a typical 1920×1080 security screen, aim to display roughly 10–15 visitor rows without excessive scrolling.

Compact does not mean cramped.

Spacing should clarify grouping.

---

## 4. Internal Application Shell

Desktop-first.

Recommended:

- collapsible left sidebar,
- compact top bar,
- main content,
- right-side drawer for quick operational actions where useful.

Sidebar and navigation are role-aware.

---

## 5. Visitor Public Flow

Mobile-first.

No internal sidebar.

Use:

- organization logo,
- short visit summary,
- visitor form,
- rules,
- acceptance,
- confirmation/QR.

---

## 6. Navigation

### Employee

- Home / My Visits
- Visits
- Goods Deliveries

### Security

- Dashboard
- Visitors
- Goods Deliveries

### Manager

- Dashboard
- Visits
- Goods Deliveries
- Reports

### Admin

- Dashboard
- Users
- Organization
- Visit Types
- Visitor Cards
- Visitor Rules
- Settings

Show only allowed routes.

---

## 7. Top Bar

May include:

- company/facility context,
- notifications,
- current user/profile.

Example:

`Company B / Factory 1 ▼`

Security restricted to one site may not need the context switcher.

---

## 8. Components and Styling

Use Tailwind CSS and shadcn/ui.

shadcn/ui is a foundation, not a visual constraint.

Adjust component:

- padding,
- density,
- radius,
- table spacing,
- drawer width,
- form spacing

to match this specification.

Do not blindly accept default library spacing.

---

## 9. Tables

Tables are core.

Use:

- compact rows,
- sticky headers where useful,
- clear status chips,
- responsive column priority,
- one obvious primary action,
- secondary actions under a three-dot menu.

Use TanStack Table when advanced behavior justifies it.

---

## 10. Drawers

Prefer right-side drawers for:

- visitor detail,
- check-in,
- card assignment,
- visitor corrections,
- check-out.

This reduces navigation for security users.

---

## 11. Forms

Use compact grouped forms.

Use React Hook Form + Zod for non-trivial forms.

Use:

- labels above fields,
- clear required markers,
- inline validation,
- conditional fields.

Example:

Vehicle = No:
- hide plate.

Vehicle = Yes:
- show plate.

---

## 12. Employee Dashboard

Planning-oriented, not analytics-oriented.

Primary:

- page title,
- New Visit,
- Day / Week / Month,
- visit timeline,
- upcoming visits.

The timeline is Gantt-like but visitor-specific.

Do not use a full project-management Gantt library in the initial implementation.

Implement a focused timeline with React/Tailwind/CSS layout.

Visit blocks should show:

- visitor,
- time range,
- status.

Cancelled visits remain visible with muted/cancelled treatment.

---

## 13. New Visit

Compact form.

Visitor:
- First name
- Last name
- Email

Visit:
- Visit type
- Host employee
- Host company
- Facility
- Date
- Start
- End

Additional:
- Note

Primary action:
- Send Invitation

Do not force employee to enter all visitor details that can later be completed by the visitor.

---

## 14. Security Dashboard

Top:

- visitor/QR search,
- Unplanned Visitor action.

Compact indicators:

- Inside
- Expected
- Overdue
- Cards Not Returned

Tabs:

- Expected
- Inside
- Overdue
- Completed

Main:
- visitor table.

---

## 15. Security Visitor Drawer

Show:

- visitor,
- visitor company,
- host,
- host company/facility,
- visit type,
- planned times,
- rule acceptance,
- plate,
- note.

Before check-in:
- visitor card selector,
- Check In.

After check-in:
- actual check-in,
- current duration,
- planned end,
- overdue if relevant,
- Check Out.

Check-out supports:
- card returned,
- card not returned.

---

## 16. Overdue Alert

Do not use a weak disappearing toast.

Use a persistent actionable notification/alert.

Show:

- visitor,
- amount overdue,
- host,
- visitor card when relevant,
- action to open visit.

May be dismissed temporarily and reappear later.

Avoid a full-screen blocking modal by default.

---

## 17. Visitor Pre-registration

Mobile-first public page.

Suggested:

- logo,
- invitation title,
- date/time,
- facility,
- host,
- visitor details,
- company,
- phone,
- vehicle yes/no,
- conditional plate,
- rules,
- explicit acceptance,
- complete registration.

After completion:

- confirmation,
- QR,
- short visit summary.

---

## 18. Goods Delivery

Separate module.

Employee:
- create expected delivery,
- view own delivery records.

Security:
- expected,
- arrived,
- completed.

Important information:

- company,
- goods/material,
- facility,
- expected time,
- optional plate,
- optional driver.

Clearly show:

- gate-only delivery,
- driver entering facility.

---

## 19. Manager Dashboard

Initial indicators:

- Inside
- Expected Today
- Arrived Today
- Overdue
- Cards Not Returned
- Expected After-Hours Deliveries

Below:

- operational summaries,
- limited charts only when useful.

---

## 20. Reports

Filter-first.

Potential filters:

- date,
- company,
- facility,
- department,
- host,
- visitor company,
- visit type,
- status,
- plate,
- overdue.

Actions:
- Excel
- PDF

The table is primary.

Limit charts to useful summaries.

### Manager All Visits

- Remains a read-only operational list.
- Uses compact date-range, company, facility, status, visit-type, host, invitation, and additional-requirement filters.
- Persists filters in the URL and paginates the filtered result.
- Opens visit details in a right-side drawer without leaving the page.
- Shows invitation delivery and additional-requirement indicators separately from the operational visit status.
- Does not expose meeting grouping or resource-assignment actions in this phase.

---

## 21. Admin

Use one consistent management pattern:

- page title,
- Add action,
- search/filter,
- compact table,
- status,
- row actions.

Modules:

- Users
- Companies
- Facilities
- Gates
- Visit Types
- Visitor Cards
- Rule Versions
- Settings

Settings include:
- overdue tolerance,
- overdue alert repeat interval.

---

## 22. Responsive

Internal:
- desktop-first,
- tablet-usable.

Public visitor flow:
- mobile-first.

---

## 23. Accessibility

Use:

- visible focus,
- adequate contrast,
- semantic labels,
- keyboard accessibility,
- statuses not conveyed by color alone.

---

## 24. Interaction

Use restrained motion only:

- drawer transitions,
- loading skeletons,
- button feedback.

Avoid playful or decorative animation.

---

## 25. Mock-to-Real Transition

UI code created during early phases is retained.

Mock data must be behind replaceable service boundaries.

Real APIs should later replace the mock implementation without redesigning the screens.
