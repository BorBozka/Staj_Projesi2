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
