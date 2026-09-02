import { ApiClientError } from "./errors"

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | QueryValue[]>

export interface HttpRequestOptions {
  /** Serialized onto the query string; `null`/`undefined` entries are dropped, arrays repeat the key. */
  query?: QueryParams
  /** Forwarded to `fetch`; an abort rejects with the original `AbortError`, not an `ApiClientError`. */
  signal?: AbortSignal
}

export interface HttpClientOptions {
  /** Absolute API base, e.g. `http://localhost:3001/api`. A trailing slash is trimmed. */
  baseUrl: string
  /** Injectable for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
  /** Called with the error whenever any request fails with `401`, before it is thrown. */
  onUnauthorized?: (error: ApiClientError) => void
}

/**
 * Small central HTTP client for the real backend.
 *
 * - always sends `credentials: "include"` so the opaque HttpOnly session cookie rides along,
 * - JSON in / JSON out, with `204`/`205` resolving to `undefined`,
 * - every non-2xx response and every transport failure becomes an {@link ApiClientError},
 * - `401` is surfaced through `onUnauthorized` so the session layer can drop to logged-out,
 * - nothing is retried automatically — an unsafe mutation must never be silently re-sent.
 */
export class HttpClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private onUnauthorized?: (error: ApiClientError) => void

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
    this.onUnauthorized = options.onUnauthorized
  }

  /** Replace (or clear) the 401 handler after construction — used when wiring the session adapter. */
  setUnauthorizedHandler(handler: ((error: ApiClientError) => void) | undefined): void {
    this.onUnauthorized = handler
  }

  get<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options)
  }

  post<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options)
  }

  patch<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options)
  }

  put<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options)
  }

  delete<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options)
  }

  private async request<T>(method: string, path: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    const url = this.baseUrl + path + serializeQuery(options?.query)
    const hasBody = body !== undefined
    const headers: Record<string, string> = { Accept: "application/json" }
    if (hasBody) headers["Content-Type"] = "application/json"

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method,
        credentials: "include",
        headers,
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      })
    } catch (cause) {
      // A caller-driven abort is not a backend failure — let the original rejection through.
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause
      if (cause instanceof Error && cause.name === "AbortError") throw cause
      throw new ApiClientError({
        code: "NETWORK_ERROR",
        message: "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip yeniden deneyin.",
        status: 0,
        details: cause,
      })
    }

    if (response.status === 204 || response.status === 205) return undefined as T

    const rawText = await response.text().catch(() => "")
    const payload = rawText ? safeJsonParse(rawText) : undefined

    if (!response.ok) {
      const error = toApiClientError(response.status, payload)
      if (error.status === 401) this.onUnauthorized?.(error)
      throw error
    }

    return payload as T
  }
}

export function serializeQuery(query: QueryParams | undefined): string {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry === null || entry === undefined) continue
        params.append(key, String(entry))
      }
    } else {
      params.append(key, String(value))
    }
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

interface BackendErrorEnvelope {
  error?: { code?: unknown; message?: unknown; details?: unknown }
}

function toApiClientError(status: number, payload: unknown): ApiClientError {
  const backendError = (payload as BackendErrorEnvelope | undefined)?.error
  const backendCode = typeof backendError?.code === "string" && backendError.code ? backendError.code : undefined
  const backendMessage = typeof backendError?.message === "string" && backendError.message ? backendError.message : undefined

  // Server faults must never carry implementation/SQL detail into UI copy.
  if (status >= 500) {
    return new ApiClientError({
      code: backendCode ?? "INTERNAL_ERROR",
      message: "Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
      status,
    })
  }

  return new ApiClientError({
    code: backendCode ?? fallbackCodeForStatus(status),
    message: backendMessage ?? fallbackMessageForStatus(status),
    status,
    details: backendError?.details,
  })
}

function fallbackCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR"
    case 401:
      return "UNAUTHENTICATED"
    case 403:
      return "FORBIDDEN"
    case 404:
      return "NOT_FOUND"
    case 409:
      return "CONFLICT"
    default:
      return "HTTP_ERROR"
  }
}

function fallbackMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Geçersiz istek."
    case 401:
      return "Oturum gerekli veya geçersiz."
    case 403:
      return "Bu işlem için yetkiniz yok."
    case 404:
      return "Kayıt bulunamadı."
    case 409:
      return "İşlem, güncel durumla çakıştığı için tamamlanamadı."
    default:
      return "İstek tamamlanamadı."
  }
}
