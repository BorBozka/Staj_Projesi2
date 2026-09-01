import { describe, expect, it } from "vitest"
import type { FastifyReply, FastifyRequest } from "fastify"

import { createAuthGuards } from "./auth-guards.js"
import type { AuthService } from "./auth-service.js"

const manager = {
  id: "manager-1",
  username: "yonetici",
  fullName: "Atahan Bozkurt",
  initials: "AB",
  role: "MANAGER" as const,
  roleLabel: "Yönetici",
  authenticationSource: "LOCAL" as const,
}

describe("role middleware", () => {
  it("sets the current session user and rejects a role outside the allowed set", async () => {
    const authService = { getCurrentSession: async () => manager } as unknown as AuthService
    const guards = createAuthGuards(authService, { sessionCookieName: "bplas_session" })
    const request = { currentUser: null, cookies: { bplas_session: "opaque-token" } } as unknown as FastifyRequest
    const reply = {} as FastifyReply
    const requireManager = guards.requireRole("MANAGER") as unknown as (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    const requireAdmin = guards.requireRole("ADMIN") as unknown as (request: FastifyRequest, reply: FastifyReply) => Promise<void>

    await requireManager(request, reply)
    expect(request.currentUser).toEqual(manager)
    await expect(requireAdmin(request, reply)).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" })
  })
})
