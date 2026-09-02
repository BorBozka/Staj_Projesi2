import { HttpClient } from "./client"

/**
 * API base URL resolution:
 *   - `VITE_API_BASE_URL` from the environment when set (see `.env.example`),
 *   - otherwise the local backend from `pnpm --filter @visitor-management/api dev` on port 3001.
 *
 * `localhost:5173` (Vite) and `localhost:3001` (Fastify) are the same site, so the
 * `SameSite=Lax` session cookie is sent on `credentials: "include"` requests in development.
 */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  const trimmed = typeof raw === "string" ? raw.trim() : ""
  return trimmed.length > 0 ? trimmed : "http://localhost:3001/api"
}

/** Process-wide client every HTTP service adapter shares. */
export const apiClient = new HttpClient({ baseUrl: resolveApiBaseUrl() })

export { HttpClient } from "./client"
export { ApiClientError, isApiClientError } from "./errors"
export type { HttpClientOptions, HttpRequestOptions, QueryParams, QueryValue } from "./client"
