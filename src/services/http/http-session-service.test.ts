import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { apiClient } from "@/lib/http"
import { HttpSessionService } from "@/services/http/http-session-service"

const userDto = {
  id: "u1", username: "calisan", fullName: "Maya Kara", initials: "MK",
  role: "EMPLOYEE", roleLabel: "Çalışan", authenticationSource: "LOCAL",
  authorizationScope: { companyIds: ["bplas"], facilityIds: [], securityGateIds: [] },
  employeeId: "maya-kara",
}

let responder: (url: string, init?: RequestInit) => Response

beforeEach(() => {
  responder = () => new Response(JSON.stringify({ user: null }), { status: 200, headers: { "Content-Type": "application/json" } })
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => responder(String(input), init))
})

afterEach(() => {
  vi.unstubAllGlobals()
  apiClient.setUnauthorizedHandler(undefined)
})

describe("HttpSessionService", () => {
  it("login maps the projection (scope + employeeId) and notifies subscribers", async () => {
    responder = () => new Response(JSON.stringify({ user: userDto }), { status: 200, headers: { "Content-Type": "application/json" } })
    const service = new HttpSessionService()
    const seen: (unknown)[] = []
    service.subscribe((session) => seen.push(session))

    const session = await service.login("calisan", "calisan")
    expect(session).toMatchObject({ id: "u1", role: "EMPLOYEE", employeeId: "maya-kara" })
    expect(session.authorizationScope).toEqual({ companyIds: ["bplas"], facilityIds: [], securityGateIds: [] })
    expect(seen.at(-1)).toMatchObject({ id: "u1" })
  })

  it("getCurrentSession resolves null and notifies logged-out when there is no cookie", async () => {
    const service = new HttpSessionService()
    const seen: (unknown)[] = []
    service.subscribe((session) => seen.push(session))
    await expect(service.getCurrentSession()).resolves.toBeNull()
    expect(seen).toEqual([null])
  })

  it("drops every subscriber to logged-out when any request 401s after a session existed", async () => {
    responder = (url) =>
      url.endsWith("/auth/login")
        ? new Response(JSON.stringify({ user: userDto }), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Oturum gerekli." } }), { status: 401, headers: { "Content-Type": "application/json" } })

    const service = new HttpSessionService()
    const seen: (unknown)[] = []
    service.subscribe((session) => seen.push(session))
    await service.login("calisan", "calisan")

    await apiClient.get("/visits").catch(() => undefined)
    expect(seen.at(-1)).toBeNull()
  })

  it("ignores the 401 a rejected login itself produces", async () => {
    responder = () => new Response(JSON.stringify({ error: { code: "INVALID_CREDENTIALS", message: "hatalı" } }), { status: 401, headers: { "Content-Type": "application/json" } })
    const service = new HttpSessionService()
    const seen: (unknown)[] = []
    service.subscribe((session) => seen.push(session))
    await service.login("x", "y").catch(() => undefined)
    expect(seen).toEqual([])
  })

  it("logout notifies logged-out even if the request fails", async () => {
    responder = () => new Response("boom", { status: 500 })
    const service = new HttpSessionService()
    const seen: (unknown)[] = []
    service.subscribe((session) => seen.push(session))
    await service.logout().catch(() => undefined)
    expect(seen.at(-1)).toBeNull()
  })
})
