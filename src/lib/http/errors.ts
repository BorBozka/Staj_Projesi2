/**
 * Single typed error model the whole frontend uses for backend failures.
 *
 * The backend answers handled failures with `{ error: { code, message, ... } }` and unexpected
 * failures with `INTERNAL_ERROR` and no implementation/SQL/session detail. The HTTP client maps
 * every non-2xx response — and transport failures — into one `ApiClientError` so feature code
 * never branches on `Response` shapes or raw `fetch` rejections.
 */
export class ApiClientError extends Error {
  /** Machine-readable code: the backend `error.code`, or a status-derived fallback. */
  readonly code: string
  /** HTTP status; `0` for a transport/network failure that never reached the server. */
  readonly status: number
  /** Optional structured extra from the backend `error` object. Never rendered as UI copy. */
  readonly details?: unknown

  constructor(params: { code: string; message: string; status: number; details?: unknown }) {
    super(params.message)
    this.name = "ApiClientError"
    this.code = params.code
    this.status = params.status
    this.details = params.details
  }

  /** The request was rejected because there is no valid session. */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** The session is valid but the action is not permitted for this user/scope. */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /** A concurrency/business conflict (e.g. resource double-booking, stale mutation). */
  get isConflict(): boolean {
    return this.status === 409
  }

  /** The request never reached the backend (server down, DNS, offline, CORS). */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

export function isApiClientError(value: unknown): value is ApiClientError {
  return value instanceof ApiClientError
}
