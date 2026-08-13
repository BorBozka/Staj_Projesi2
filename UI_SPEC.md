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

Visitors:
- At least one visitor is required.
- Visitors can be added and removed without repeating shared meeting fields.
- First name, last name, and email are validated separately for every visitor.
- Phone remains optional.

Shared meeting/visit information, shown once:
- Visit type
- Host employee
- Host company
- Facility
- Date
- Start
- End

Additional:
- Note
- Additional-requirement indicator and description

Actions:
- Save creates one Meeting and a separate Visit for every visitor.
- Send Invitation remains disabled until Save succeeds.
- Changing saved shared or visitor data requires another successful save before sending.
- The first Send Invitation action sends only the Meeting's visitors whose invitations
  have not already been sent.
- Invitation success or failure is shown and retained per visitor. Failed invitations can
  be retried individually.

Keep accessible labels and keyboard behavior, and focus the first invalid field when Save
validation fails.

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

Do not show the additional-requirement description to the Security role.

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
- Opens visit details in a right-side drawer which provides tabs for visit details and Meeting resource assignment.
- Shows invitation delivery and additional-requirement indicators separately from the operational visit status.
- Continues to show one row per visitor/Visit; do not redesign or group the table by Meeting.

### Manager Resource Catalog

- Matches the headerless Manager All Visits hierarchy: a compact filter card first,
  followed directly by the dense resource list and its pagination footer.
- Keeps an accessible non-visual page heading and places the Add action in the filter
  card instead of creating a separate visible title/action row.
- Uses company/facility/type/active filters and nine records per page.
- Lists rooms, pooled equipment, individual vehicles, and individual drivers together.
- Shows resource identity/details, user-facing type label, company/facility, quantity,
  and status without adding vehicle/driver-specific table columns.
- Shows vehicle brand, model, and license plate; shows driver full name, license classes,
  commercial-vehicle capability, and a compact document/qualification summary.
- Displays `—` for room, vehicle, and driver quantity and a numeric total only for pooled
  equipment.
- Uses one compact create/edit dialog with type-specific fields. Type can be selected only
  during creation and is read-only while editing.
- Requires name for rooms/equipment, positive whole-number quantity for pooled equipment,
  brand/model/license plate for vehicles, and full name plus at least one license class for
  drivers. Driver documents remain optional textual names; commercial-vehicle capability
  uses a user-facing Yes/No control.
- Clears an invalid facility selection when company changes.
- Uses active/inactive actions instead of deletion.
- Provides loading, error, unfiltered-empty, and filtered-empty states.
- Reflows without page-level horizontal overflow at tablet and narrow widths.
- Does not expose vehicle-driver fleet assignment, reservation override, notification, or audit controls. Employees continue to use the additional-requirement note rather than selecting resources.

### Manager Meeting Resource Assignment UI

- **Tabbed Drawer Shell:** The right-side visit detail drawer in Manager `All Visits` includes two restrained text tabs: `Ziyaret Bilgileri` and `Kaynaklar`.
- **Tab Indicators:**
  - The `Kaynaklar` tab header displays a compact numeric count badge (e.g. `1`, `2`) when the meeting has active resource assignments.
  - The `Kaynaklar` tab header displays a small amber dot indicator when the local resource draft has unsaved changes.
- **Inline Editing & Pickers:**
  - Selecting a room displays an inline picker with real-time availability status (`Seç` button for available rooms; conflict reason text for unavailable rooms).
  - Selecting equipment displays an inline picker showing remaining available capacity (`X / Y kullanılabilir`).
  - Equipment quantity controls use explicit increment/decrement stepper buttons and numeric input validation capped at available capacity.
- **Local Draft & Unsaved Footer:**
  - All resource additions, replacements, quantity updates, and removals update a local working draft immediately without calling backend/service APIs.
  - When unsaved draft changes exist, a sticky bottom footer bar appears displaying `Kaydedilmemiş değişiklikler` with `Kaydet` and `Vazgeç` actions.
  - `Kaydet` triggers atomic save; `Vazgeç` restores the working draft back to the last persisted state.
- **Unsaved-Change Confirmation Guard:**
  - Attempting to close the drawer (via `✕` button, Escape key, or overlay click) while draft changes are unsaved is intercepted by a guard.
  - A modal confirmation dialog (`Kaydedilmemiş değişiklikler`) is presented with actions `Değişiklikleri sil` (discards draft and closes drawer) and `Geri dön` (cancels close and returns to editing).
- **Read-Only UI State:**
  - For completed meetings (all visits `CHECKED_OUT`, `CANCELLED`, or `NO_SHOW`), the `Kaynaklar` panel is rendered in read-only mode, hiding all add, change, edit, remove, and save controls.

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
