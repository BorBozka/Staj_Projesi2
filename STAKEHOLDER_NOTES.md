# Stakeholder Notes and Decision Backlog

This file records newly collected stakeholder ideas before they become binding product
requirements. Items marked **Decision needed** must not be implemented as assumed
business rules. After approval, move the final rule into `PRODUCT_SPEC.md`, the interface
decision into `UI_SPEC.md`, and the implementation sequence into `DEVELOPMENT_PLAN.md`.

## 1. Confirmed, Small-Scope Requirement

### Optional visitor phone

- Phone is optional when an employee creates or edits a visit.
- Email remains required for a planned visit because the invitation and
  pre-registration flow depend on it.
- If a phone is provided, it is stored on the visitor and shown in visit details.
- The visitor may later correct it during pre-registration; security may correct it
  under the existing permitted-fields rule.

Status: **Approved and implemented in the current frontend/mock-service scope.**

## 2. Resource Management

Stakeholder note:

- Manage company resources.
- Different facilities have different resources.
- Meeting rooms can be selected for a meeting.
- Equipment examples: notebook and projector.

Approved direction (moved to `PRODUCT_SPEC.md` and `UI_SPEC.md`):

- Keep the existing rule that every individual visitor has a separate visit record.
- A meeting groups one or more visit records and owns the shared room/equipment
  reservations so the same resource is not reserved once per participant.
- A resource belongs to one company and normally one facility.
- Meeting rooms are facility-specific resources.
- Notebooks and projectors are facility-specific pooled quantities, not individually
  serialized assets.
- The employee records additional requirements as a note; the employee does not select
  or reserve resources.
- Managers/human resources assign rooms and equipment after reviewing the note.
- Availability must be checked against facility, active state, and overlapping
  reservations.
- The employee creates one meeting and adds its attendees separately. Each attendee
  remains a separate visit record.
- An unavailable requested resource does not block the meeting. Managers/human resources
  see availability or shortage information and resolve it operationally.

Decision needed:

1. Which manager permissions may create, edit, cancel, and override an assignment?
2. Is resource assignment available only for the `Meeting` visit type, or for every
   visit type?
3. Must a room be assigned, or is it always optional?

## 3. Save and Send Workflow

Stakeholder note:

- Provide separate `Save` and `Send` actions.
- `Send` must not be active before the record is saved.

Approved direction (moved to `PRODUCT_SPEC.md` and `UI_SPEC.md`):

- `Save` remains visually enabled so clicking it can validate the form and focus the
  first invalid required field.
- All required fields must still be valid before a record is created or updated.
- Saving creates a `PLANNED` visit that immediately appears to security.
- `Send Invitation` is disabled until the save succeeds.
- If a saved field changes, `Send Invitation` is disabled until the changes are saved.
- Keep visit operational status separate from invitation delivery state.
- A successfully sent invitation does not need a general resend action in the initial
  scope. Delivery failure and retry remain a separate error case.
- Use the existing `Notifications` destination as an actionable task center rather than
  adding a second sidebar destination.
- Show a count badge for saved visits whose invitation has not been sent.
- Each item should open the visit and expose `Send Invitation`.
- The reminder must remain until the invitation is sent; a disappearing toast alone is
  insufficient.
- After save, keep the dialog open, show saved feedback, and enable invitation sending.

## 4. Additional Requirements on a Visit

Stakeholder note:

- Add a selectable `Additional requirements` control to the visit record.

Approved direction (moved to `PRODUCT_SPEC.md` and `UI_SPEC.md`):

- Use a simple additional-requirement control that reveals a short free-text note.
- Do not show a resource multi-select or catalogue to the employee.
- Managers/human resources interpret the note and assign available resources.
- Keep the additional-requirement note separate from the general visit/security note.
- Show it to the host/organizer and authorized managers/resource administrators, but not
  to security.

Decision needed:

1. Should the employee be notified when resources are assigned or when the request
   cannot be fulfilled?

## 5. Company Vehicles and Drivers

Stakeholder note:

- Assign company vehicles and drivers for planned and unplanned/security-created work.
- Track plate, make, and model.
- Produce monthly vehicle reports such as distance travelled.

This should be a fleet/transport domain, not extra fields attached to the visitor's
arrival vehicle. Visitor plate and company fleet vehicle are different concepts.

Approved direction (moved to `PRODUCT_SPEC.md` and `UI_SPEC.md`):

- Each `Vehicle` is tracked individually by company/facility, plate, make, model, and
  active state.
- `Driver`: employee or authorized driver identity, company/facility eligibility,
  active state.
- `VehicleAssignment`: purpose/related visit, planned or unplanned origin, vehicle,
  driver, planned times, actual times, start/end odometer, distance.
- Planned assignments are made by managers/human resources.
- Security may create an unplanned assignment for an immediate need without prior
  human-resources involvement.
- Start/end odometer values are entered manually by a user.
- Monthly distance is derived from completed assignments; it is not entered as an
  isolated monthly total.
- The fleet module covers all company transportation needs.
- Security enters start/end odometer values; drivers are not assumed to have application
  access.

Decision needed:

1. Are drivers always employees, or can external/contract drivers be recorded?
2. Are vehicle and driver reservations allowed independently?

## 6. Meeting End Lifecycle

Stakeholder note:

- When allocated meeting time ends, show `Postpone` and `End meeting` actions.
- If security checks the visitor out while the meeting is still open, end the meeting
  automatically.
- Measure the difference from the planned meeting end.

Approved direction (moved to `PRODUCT_SPEC.md` and `UI_SPEC.md`):

- Keep `Visit` and `Meeting` lifecycles separate. Security check-out closes physical
  presence; meeting end closes the business event and releases reserved resources.
- A meeting may contain multiple individual visit records while keeping one planned
  time range and one set of resource reservations.
- Store `actualMeetingEnd` rather than overwriting `plannedEnd`.
- Derive `meetingEndVarianceMinutes = actualMeetingEnd - plannedEnd` for reporting.
- Automatic closure on visitor check-out should store its reason/source as
  `VISITOR_CHECK_OUT`.
- The relevant host/organizing employee receives the prompt.
- Available actions are 15-minute extension, 30-minute extension, custom extension,
  and end meeting.
- Extension rechecks resource conflicts and must not silently take another reservation.
- For a meeting with several visitors, automatic closure occurs only when security
  checks out the last visitor still inside.

Decision needed:

1. What happens when the extension conflicts with the next room/resource reservation:
   block it completely or offer an alternate room/resource?
2. Should the measured difference be signed (early/late) or only overtime minutes?
3. If the host ignores/dismisses the prompt and visitors remain inside, how often should
   it repeat or escalate?

## 7. Future Online Meeting Integration

Stakeholder note:

- In the future, meetings planned in services such as Zoom may automatically appear in
  the application.

Recommended direction:

- Treat this as a later integration phase after the meeting domain and identity mapping
  are approved.
- Prefer calendar/provider webhooks or supported APIs over polling where possible.
- Store external provider and event ID for idempotency; updates and cancellations must
  synchronize without producing duplicate meetings.
- An online-only meeting should not automatically create a physical visitor visit.

Decision needed later:

1. Which source is authoritative: Zoom, Microsoft 365/Outlook, Google Calendar, or the
   visitor application?
2. Which external participants, if any, should create visitor records?
3. How should organizer/host identities map to internal users?

## 8. Suggested Delivery Order

1. **Current small change:** optional visitor phone.
2. **Approved UI phase:** grouped meetings, validation-on-Save, post-save Send,
   notification-center reminders, and a separate additional-requirement note.
3. **Resource MVP:** facility meeting rooms, pooled equipment, manager assignment,
   availability, and conflict handling.
4. **Meeting lifecycle:** actual end, extend/end prompt, resource release, and variance
   reporting.
5. **Fleet module:** vehicle/driver inventory, assignments, odometer tracking, and
   monthly reporting.
6. **External integrations:** online meeting synchronization after the internal meeting
   model is stable.

Approved portions have been transferred to the authoritative specifications. Do not
implement these phases until the user explicitly requests the corresponding phase; keep
the remaining questions above open rather than inventing answers.
