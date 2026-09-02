# API Contract

## Base path and versioning

Backend Phase 1 uses the unversioned base path `/api`. No frontend adapter consumes it yet.
The first externally deployed breaking contract will introduce a versioned base path (for example
`/api/v1`) as an explicit API-integration decision; this phase deliberately does not expose
parallel aliases.

All timestamps returned by future API endpoints will be ISO-8601 UTC strings. Time-only values,
such as `workdayEndTime`, remain `HH:mm` semantic values rather than timestamps.

## Error shape

Handled application errors use one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Geçersiz istek gövdesi."
  }
}
```

Unexpected errors return `INTERNAL_ERROR` without implementation, database, credential, or
session-token detail. Login rejects unknown usernames, incorrect passwords, inactive accounts,
and non-LOCAL accounts with the same `401 INVALID_CREDENTIALS` response.

## Authentication and session

`POST /api/auth/login`

```json
{ "username": "calisan", "password": "calisan" }
```

On success the endpoint sets the configured `HttpOnly` opaque-session cookie and returns:

```json
{
  "user": {
    "id": "current-employee-maya-kara",
    "username": "calisan",
    "fullName": "Maya Kara",
    "initials": "MK",
    "role": "EMPLOYEE",
    "roleLabel": "Çalışan",
    "authenticationSource": "LOCAL"
  }
}
```

The browser receives only a cryptographically random token. The server stores its SHA-256 hash,
expiry, last-use timestamp, and optional revocation timestamp. Cookies are `HttpOnly`,
`SameSite=Lax`, `Path=/`, and `Secure` only in production. Session TTL comes from
`SESSION_TTL_HOURS`.

`GET /api/auth/session` returns `{ "user": <projection> }` for an active session or
`{ "user": null }` when no valid session exists.

`POST /api/auth/logout` revokes the corresponding server-side session when present, clears the
cookie, and returns `204`. It is intentionally idempotent.

## Account

`POST /api/account/change-password` requires an active LOCAL session cookie.

```json
{ "currentPassword": "calisan", "newPassword": "yeni-parola" }
```

The authenticated session determines the account; no target user ID is accepted. New passwords
must be at least eight characters and must differ from the current password. A successful change
returns `204`; invalid current passwords return `400 CURRENT_PASSWORD_INVALID`.

## Health

`GET /api/health` returns `{ "status": "ok" }` without touching the database.

`GET /api/ready` checks database reachability. It returns `{ "status": "ok" }` when ready or
`503 { "status": "unavailable" }` without database detail.

## Organization

All organization reads require an authenticated session. Operational lookups return active
records by default; append `?includeInactive=true` for administration/history screens.
Organization mutations require the `ADMIN` role. Responses use the frontend-compatible shape
`{ id, parentId?, name, active, createdAt, updatedAt }`; timestamps are ISO-8601 UTC strings.

- `GET /api/organization` returns `{ companies, facilities, departments, securityGates }`.
- `GET /api/companies`, `GET /api/facilities`, `GET /api/departments`, and
  `GET /api/security-gates` list each hierarchy level.
- `GET /api/companies/:id`, `GET /api/facilities/:id`, `GET /api/departments/:id`, and
  `GET /api/security-gates/:id` return a detail record.
- `POST /api/<kind>` and `PATCH /api/<kind>/:id` create or update a record for each hierarchy
  list path. Bodies are `{ name, active }` for companies and `{ parentId, name, active }` for
  child records.
- `GET /api/employees?companyId=&facilityId=&includeInactive=` lists employees; filters are
  optional. `GET /api/employees/:id` returns one employee, including `facilityIds`.

The service rejects an active child below an inactive parent, parent changes on existing child
records, duplicate sibling names, and deactivation while active children exist.

## Admin users

Every endpoint in this section requires `ADMIN`. User projections are compatible with the
frontend `AdminUser` model and include `authorizationScope` with `companyIds`, `facilityIds`,
and `securityGateIds` arrays. Password hashes are never returned.

- `GET /api/admin/users` and `GET /api/admin/users/:id` list/get users.
- `POST /api/admin/users` creates a `LOCAL` user. Body:

```json
{
  "fullName": "Yeni Kullanıcı",
  "username": "yeni.kullanici",
  "email": "yeni@example.com",
  "password": "en-az-sekiz-karakter",
  "role": "SECURITY",
  "authorizationScope": { "companyIds": ["bplas"], "facilityIds": [], "securityGateIds": [] },
  "active": true
}
```

- `PATCH /api/admin/users/:id` updates identity (LOCAL only), role, scopes, and/or active state.
- `PATCH /api/admin/users/:id/status` accepts `{ "active": true }`.
- `PATCH /api/admin/users/:id/role` accepts `{ "role": "MANAGER" }`.
- `PUT /api/admin/users/:id/scopes` replaces the three scope arrays transactionally.
- `POST /api/admin/users/:id/reset-password` accepts `{ "password": "..." }` for LOCAL users.

New users are always `LOCAL`; Active Directory creation/integration is not exposed. Scope
references and their company relationships are validated, and self-lockout/last-active-Admin
changes are rejected.

## Operational settings

Both endpoints require `ADMIN` and use the singleton `OperationalSettings` record with
`id = "default"`.

- `GET /api/settings/operational`
- `PUT /api/settings/operational`

```json
{ "overdueToleranceMinutes": 15, "overdueAlertRepeatMinutes": 10, "workdayEndTime": "18:15" }
```

Minutes must be whole numbers (`tolerance >= 0`, `repeat >= 1`) and `workdayEndTime` must be a
valid 24-hour `HH:mm` value.

## Resource catalog

`GET /api/resources`, `GET /api/resources/:id`, `POST /api/resources`, `PATCH /api/resources/:id`,
and `PATCH /api/resources/:id/status` require `MANAGER` or `ADMIN`. The list accepts
`includeInactive`, `companyId`, `facilityId`, and `type` (`ROOM`, `POOLED_EQUIPMENT`, `VEHICLE`,
or `DRIVER`). Status updates accept `{ "active": true }`.

Create/update bodies are type-discriminated and match the frontend catalog contract:

- `ROOM`: `{ type, companyId, facilityId, name }`
- `POOLED_EQUIPMENT`: `{ type, companyId, facilityId, name, totalQuantity }`
- `VEHICLE`: `{ type, companyId, facilityId, brand, model, licensePlate }`
- `DRIVER`: `{ type, companyId, facilityId, fullName, licenseClasses, documents, canDriveCommercialVehicles }`

The service verifies company/facility consistency, type-specific required fields, driver license
classes, positive pool quantity, company-local vehicle plate uniqueness, and immutable resource
type during editing.

## Phase 3 visitor operations

`GET /api/visit-types` lists active types by default (`includeInactive=true` keeps historical
types resolvable). `POST`, `PATCH /:id`, and `PATCH /:id/status` require `ADMIN`; names use the
same Turkish normalization and duplicate rule as the frontend.

`GET /api/meetings`, `GET /api/meetings/:id`, `GET /api/visits`,
`GET /api/visits/:id`, and `GET /api/visits/reference-data` serve the flattened visitor read
model and Meeting's shared fields. Authenticated employee/manager/admin callers can create and
edit meetings (`POST/PATCH /api/meetings`), reschedule/cancel a planned visit, cancel planned
visits in a meeting, and use host-only `POST /api/meetings/:id/extend` or `/close`. The server
resolves creator/actor identity from the session's User → Employee relation.

`POST /api/meetings/:id/invitations` sends eligible planned visitors in bulk and
`POST /api/visits/:id/invitation` sends/retries one. Visitors without email are skipped in bulk
and rejected for single delivery. State transitions are `NOT_SENT|FAILED → SENDING → SENT|FAILED`;
`SENT`/`SENDING` are never duplicated. The persisted `Invitation` row contains only a SHA-256
hash of a cryptographically-random opaque token. The email's public URL is based on `WEB_ORIGIN`
and contains no Visit ID or personal data.

Public endpoints do not need a session: `GET/PATCH /api/public/invitations/:token` reads/updates
the permitted visitor pre-registration data, and `POST .../:token/rule-acceptances` records the
active immutable rule acceptance. Invalid, cancelled, and completed invitation links return the
same generic not-found response and no internal organization/user data.

Admin inventory/rule endpoints are `GET/POST /api/admin/visitor-cards`,
`PATCH /api/admin/visitor-cards/:id`, `/status`, `/mark-lost`, `/restore`, and
`GET/POST /api/admin/visitor-rules`. Card ownership is enforced as
`AVAILABLE|DISABLED` (Admin), `IN_USE|NOT_RETURNED` (Security), and
`NOT_RETURNED → LOST → AVAILABLE` for admin write-off/restore. Rule publishing atomically
deactivates the prior version and creates the next active immutable version.

Security endpoints are `GET /api/security/visitor-cards/available`,
`GET /api/security/visitor-rules/active`, check-in/out and correction under
`/api/security/visits/:id/*`, `GET /api/security/visitor-card-issues`, and
`POST /api/security/unplanned-visits`. Check-in/out, card transitions, late return, unplanned
create/check-in, correction/audit, and last-visitor meeting auto-close run transactionally.
Host notification email is attempted only after a successful planned check-in commit; a delivery
failure is logged without rolling back the operational change.

## Email delivery configuration

`EMAIL_DELIVERY_MODE=log|smtp` defaults to `log`, which sends nothing and does not log email
bodies or raw invitation tokens. `smtp` requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM_ADDRESS`, and `MAIL_FROM_NAME`; startup fails clearly
when any required value is absent. The SMTP adapter is isolated behind the backend `EmailSender`
boundary; no provider-specific logic is present in visitor services.
