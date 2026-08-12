# PRODUCT_SPEC.md

# Visitor Management System — Product Specification

## 1. Purpose

This project is a web-based visitor management and security operations application for a multi-company, multi-facility organization.

The application manages:

- planned visitors,
- unplanned visitors,
- visitor pre-registration,
- visitor rule acceptance,
- visitor check-in and check-out,
- physical visitor card assignment and return,
- visit duration monitoring and overdue alerts,
- after-hours goods deliveries,
- multi-company and multi-facility operations,
- role-based dashboards,
- reporting and exports,
- Active Directory and local users.

This is **not** an employee HR/PDKS/access-control replacement.

Visitor cards are **not electronically connected to Starkom or any physical access-control system**. They are physical numbered visitor cards tracked by the application.

All actual visitor check-in and check-out actions are performed manually by security personnel in the web application.

---

## 2. Out of Scope

Unless explicitly added later:

- employee payroll,
- employee HR/personnel records,
- attendance/PDKS,
- antipassback,
- door/device IP or port management,
- physical turnstile/device configuration,
- Starkom card authorization,
- access-control schedules,
- biometric access,
- employee leave management,
- salary data,
- detailed employee personal records,
- automatic physical door unlocking using visitor QR.

---

## 3. Organization Model

Support:

- multiple companies,
- multiple facilities/sites per company,
- multiple security gates per facility.

A user belonging to Company A may create a visit at Company B.

Visit records must distinguish:

- creator user,
- creator company,
- host company,
- host facility,
- host employee.

Company and facility are separate concepts.

---

## 4. Roles

Initial roles:

- Employee
- Security
- Manager
- Admin

### Employee

Can:

- create planned visits,
- create visits at other active companies/facilities,
- view own created visits,
- edit permitted visit data,
- reschedule,
- cancel,
- view personal visitor timeline,
- create after-hours goods-delivery records.

### Security

Can:

- view relevant expected visitors,
- search visitors,
- locate visits using QR,
- create unplanned visits,
- correct permitted visitor data,
- assign physical visitor cards,
- check in,
- check out,
- confirm card return,
- mark card not returned,
- see visitors currently inside,
- see overdue visitors,
- see expected goods deliveries,
- record delivery arrival/departure.

Security cannot delete visit records.

Security may correct fields such as:

- visitor company,
- phone,
- plate,
- optional visitor information,
- note.

### Manager

Can:

- create visits,
- view dashboards,
- use reports,
- filter reports,
- export reports.

### Admin

Manages:

- users,
- roles,
- companies,
- facilities,
- security gates,
- departments where applicable,
- visit types,
- visitor cards,
- visitor rules and versions,
- overdue/system parameters.

---

## 5. Authentication

Support:

- Active Directory users,
- Local users.

All users may also be created locally if needed.

Where practical, Active Directory may provide:

- name,
- surname,
- username,
- email,
- department.

Authentication source and role are separate concepts.

---

## 6. Visitor vs Visit

A Visitor is a person.

A Visit is one occurrence of that person's visit.

A returning visitor should be searchable/reusable.

Previous visitor information may be pre-filled but must remain editable because company/phone/plate may change.

Every individual person has a separate visit record, even when several people arrive together.

### Meeting and Visit grouping

A `Meeting` is the business event that groups one or more individual `Visit` records.

- Every `Visit` belongs to exactly one `Meeting` through a required `meetingId`.
- Each visitor still has a separate `Visit` record, including when several visitors attend
  the same meeting.
- Existing and newly created single-visitor visits are represented by a one-to-one
  `Meeting` and `Visit` relationship.
- The `Meeting` domain object is not the same concept as the configurable `Meeting` visit
  type. Any visit type may use Meeting grouping.

The Meeting is the single source of truth for information shared by its visits:

- creator employee,
- host company,
- host facility,
- host employee,
- visit type,
- planned start and end,
- general meeting/visit note,
- additional-requirement indicator and description.

The Visit remains the source of truth for visitor-specific and operational information:

- visitor identity and contact details,
- invitation status, sent time, and delivery error,
- operational visit status,
- actual check-in and check-out times,
- visitor card,
- rule acceptance and other visitor-specific operational data.

Invitation state and operational state remain independent and are tracked per Visit.
Cancellation and security overdue behavior also remain Visit-based. Shared Meeting fields
must not be maintained as a second editable data source on Visit; screens that need both
sets of data use a combined projection.

Resource reservation, source/integration tracking, Meeting end/close behavior, and a
separate Meeting status lifecycle are later phases.

---

## 7. Visitor Data

National identity number is not required.

Potential fields:

- first name,
- last name,
- email,
- phone,
- company,
- arrives by vehicle,
- plate if applicable.

For a planned visitor, email is required because pre-registration is sent via email.

Plate is required only if the person is arriving by vehicle and the flow requires it.

---

## 8. Visit Data

At minimum:

- visitor,
- creator,
- host company,
- host facility,
- host employee,
- visit type,
- visit date,
- planned start,
- planned end,
- status.

Host employee is mandatory.

Optional/additional:

- security gate,
- note,
- visitor company,
- plate,
- visitor card,
- actual check-in,
- actual check-out,
- cancellation/reschedule metadata.

Planned start and end are mandatory.

A note field exists for special situations, including an intentionally extended visit.

---

## 9. Visit Types

Configurable by Admin.

Examples:

- Meeting
- Technical Service / Maintenance
- Supplier
- Job Interview
- Audit
- Customer Visit
- Official Visit
- Other

Goods Delivery is a separate module.

---

## 10. Planned Visit Workflow

1. Employee creates visit.
2. Visitor receives email with secure pre-registration link.
3. Visitor may complete/correct information before arrival.
4. Visitor reads and explicitly accepts company rules.
5. Visitor may receive/display QR for quick visit lookup.
6. Security locates visit using QR or search.
7. Security assigns an available visitor card.
8. Security manually checks visitor in.
9. Host employee may receive "visitor checked in" email.
10. Security manually checks visitor out and processes card return.

No internal approval workflow exists.

---

## 11. Visitor Pre-registration

Visitor can use the invitation link to:

- review visit,
- complete/correct personal data,
- enter company,
- enter phone if needed,
- indicate vehicle,
- enter plate if applicable,
- read rules,
- explicitly accept rules.

Pre-registration itself must not block arrival.

If the visitor did not complete it, security may complete necessary data at the desk.

Rule acceptance is mandatory before check-in.

---

## 12. QR

QR is used to locate/open the visit and speed up check-in.

It does not open doors.

QR should represent a non-guessable visit token, not plaintext personal information.

Cancelled/completed/invalid visits cannot use the QR to check in.

Rescheduling may retain the same visit identity/QR.

---

## 13. Unplanned Visit

1. Visitor arrives at security.
2. Security creates visit.
3. Security may phone host employee.
4. Visitor data is completed.
5. Rules are shown at security desk.
6. Visitor explicitly accepts rules.
7. Security assigns visitor card.
8. Security checks visitor in.

No internal digital approval workflow is required.

---

## 14. Rule Acceptance

Mandatory before check-in.

Store separately:

- visit ID,
- visitor ID,
- rule/version ID,
- rule version,
- acceptance timestamp,
- acceptance method,
- accepted content snapshot or integrity hash.

Recommended methods:

- `INVITATION_LINK`
- `SECURITY_DESK`

IP may be retained where appropriate.

Rules are versioned.

Changing rules creates a new version.

Historical versions and acceptance records are immutable.

Legal/KVKK review may later add requirements.

---

## 15. Visitor Cards

Physical numbered cards only.

Suggested states:

- `AVAILABLE`
- `IN_USE`
- `NOT_RETURNED`
- `LOST`
- `DISABLED`

Only available cards can be assigned.

An in-use card cannot be assigned to another active visit.

Check-in:

- security selects card,
- confirms check-in,
- actual check-in time is stored,
- card becomes `IN_USE`.

Normal check-out:

- security checks visitor out,
- confirms card returned,
- actual check-out time is stored,
- card becomes `AVAILABLE`.

Preferred UI action:

`Check Out + Confirm Card Return`

If card is not returned:

- visit may still be checked out,
- card becomes `NOT_RETURNED`.

---

## 16. Visit Status

Stored states:

- `PLANNED`
- `CHECKED_IN`
- `CHECKED_OUT`
- `CANCELLED`
- `NO_SHOW`

`OVERDUE` is calculated, not permanently stored.

A visit is overdue when:

- status is `CHECKED_IN`,
- no actual check-out exists,
- current time exceeds planned end plus configured tolerance.

A visit that never checked in must not generate an overdue alert.

It may become `NO_SHOW`.

---

## 17. Cancellation and Rescheduling

Employees may cancel and reschedule their own planned visits.

Cancelled visits are not deleted and remain visible historically/timeline.

Cancelled visits cannot be checked in.

Their QR cannot be used for check-in.

Rescheduling changes planned date/time on the existing visit.

---

## 18. Overdue Logic

Mandatory planned start and end.

Configurable:

- overdue tolerance in minutes,
- security alert repeat interval.

Suggested defaults:

- tolerance: 0 minutes,
- repeat: 15 minutes.

If a checked-in visitor is overdue:

- show overdue state,
- security receives persistent actionable alert,
- alert may be dismissed temporarily,
- alert may repeat after configured interval until visitor exits.

No overdue email is sent to the host employee.

---

## 19. Notifications

Planned:

- invitation email to visitor,
- "visitor checked in" email to host employee.

No host overdue email.

---

## 20. Employee Interface

Planning-oriented.

Core:

- create visit,
- own visit timeline,
- Day / Week / Month,
- upcoming visits,
- edit,
- reschedule,
- cancel.

Timeline statuses include:

- Planned
- Checked In
- Checked Out
- Cancelled
- No Show

---

## 21. Security Interface

Operational.

Primary indicators:

- inside,
- expected today,
- overdue,
- cards not returned.

Primary tabs:

- Expected
- Inside
- Overdue
- Completed

Primary actions:

- search/QR,
- unplanned visitor,
- card assignment,
- check-in,
- check-out,
- card returned/not returned.

---

## 22. Manager and Reporting

Initial indicators:

- currently inside,
- expected today,
- arrived today,
- overdue,
- cards not returned,
- expected after-hours deliveries.

Initial report filters:

- date range,
- company,
- facility,
- department,
- visitor,
- visitor company,
- host employee,
- visit type,
- visit status,
- plate,
- overdue.

Exports:

- Excel
- PDF

Use limited charts; filtered table is primary.

The manager `All Visits` view is read-only and provides:

- URL-persisted date-range and operational filters,
- compact paginated visit records,
- invitation and additional-requirement visibility,
- a right-side read-only visit detail panel.

Meeting grouping and resource assignment are not part of this view in the current phase.
It continues to show one row per visitor/Visit and is not redesigned for Meeting grouping.

---

## 22A. Resource Catalog

Managers maintain a frontend/mock-service catalog of facility resources independently
from visit types.

Supported catalog records:

- `ROOM`: one named meeting room belonging to one company and one facility; it has no
  quantity field.
- `POOLED_EQUIPMENT`: a named facility equipment pool belonging to one company and one
  facility; it stores a positive total quantity rather than serialized devices.
- `VEHICLE`: one individual company vehicle belonging to one company and one facility;
  brand, model, and license plate are stored separately and it has no quantity field.
- `DRIVER`: one individual driver resource belonging to one company and one facility;
  full name, one or more license classes, textual document/qualification names, and an
  explicitly recorded commercial-vehicle capability are stored independently from any
  vehicle.

Vehicles and drivers are separate catalog resources. A vehicle has no permanent/default
driver, and the catalog does not pair vehicles with drivers. Employees do not select
resources while creating visits. The existing additional-requirement note remains free
text and is not a structured resource request or assignment.

Every resource has an active/inactive lifecycle. Resources are not deleted in this
phase. The selected facility must belong to the selected company.

The catalog phase includes listing, filtering, creating, editing, and activating or
deactivating all four resource types. It does not include Meeting assignment,
vehicle-driver assignment, reservation, availability, conflict detection, override,
audit history, or employee notification. Manager assignment is a later phase. Resource
availability does not block Meeting or Visit creation, and an additional-requirement note
is not a resource request.

---

## 23. After-Hours Goods Delivery

Separate module.

Any employee may create an expected delivery.

Required:

- target facility,
- expected date,
- expected time/time window,
- supplier/company,
- goods/material description.

Optional:

- plate,
- driver,
- driver phone,
- related employee,
- department,
- note,
- order/delivery reference.

Recommended states:

- `EXPECTED`
- `ARRIVED`
- `COMPLETED`
- `CANCELLED`

Track both:

- actual arrival time,
- actual departure/completion time.

If driver only hands goods over at the gate, the driver is not treated as a visitor.

If driver enters the facility, the driver must also go through the visitor workflow.

---

## 24. Multi-Facility Context

Support top-level company/facility context.

Managers/Admin may switch context.

Security may be restricted to its facility/gate and therefore not need a switcher.

---

## 25. Historical Metadata

Full user-facing audit-log module is not initially required.

Retain useful metadata such as:

- created by,
- created at,
- updated at,
- cancelled at,
- cancellation actor where applicable.

Rule acceptance history is immutable.

Normal users do not delete visit records.

---

## 26. Retention

Legal data retention period is not yet finalized.

Do not hard-code a permanent retention policy.

Architecture should permit retention rules later.

---

## 27. UX Principles

Prioritize:

- fast security operations,
- low form friction,
- compact information density,
- minimal unnecessary navigation,
- role-specific interfaces,
- clear statuses,
- predictable workflows.

Employee visit creation should remain compact.

Visitor pre-registration is mobile-first.

Internal application is desktop-first.

---

## 28. Delivery Strategy

The project is developed module by module.

Initial emphasis is UI.

Each phase is reviewed before the next begins.

Frontend mock services are later replaced by real backend APIs rather than rewriting the frontend.
