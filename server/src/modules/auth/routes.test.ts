import { afterEach, describe, expect, it } from "vitest"

import { buildApp } from "../../app.js"
import { AuthService } from "../../auth/auth-service.js"
import { hashPassword } from "../../auth/password.js"
import { InMemoryAuthRepository } from "../../auth/testing/in-memory-auth-repository.js"
import { loadConfig } from "../../config/env.js"

const config = loadConfig({
  DATABASE_URL: "sqlserver://localhost:1433;database=visitor_operations;user=sa;password=placeholder;encrypt=true;trustServerCertificate=true",
  NODE_ENV: "test",
})

describe("auth and account HTTP routes", () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = []

  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())) })

  it("sets an HttpOnly cookie, returns the session projection, and never accepts a target user id for password change", async () => {
    const repository = new InMemoryAuthRepository([{
      id: "user-1",
      username: "calisan",
      fullName: "Maya Kara",
      role: "EMPLOYEE",
      authenticationSource: "LOCAL",
      active: true,
      passwordHash: await hashPassword("calisan"),
      authorizationScope: { companyIds: ["bplas"], facilityIds: [], securityGateIds: [] },
      employeeId: "maya-kara",
    }])
    const authService = new AuthService(repository, { sessionTtlHours: 8, createToken: () => "raw-session-token" })
    const app = await buildApp(config, { authRepository: repository, authService })
    apps.push(app)

    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "calisan", password: "calisan" } })
    expect(login.statusCode).toBe(200)
    expect(login.json()).toMatchObject({
      user: {
        id: "user-1",
        initials: "MK",
        role: "EMPLOYEE",
        employeeId: "maya-kara",
        authorizationScope: { companyIds: ["bplas"], facilityIds: [], securityGateIds: [] },
      },
    })
    const setCookie = login.headers["set-cookie"] as string
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("SameSite=Lax")
    const cookie = setCookie.split(";")[0]

    const session = await app.inject({ method: "GET", url: "/api/auth/session", headers: { cookie } })
    expect(session.json()).toMatchObject({ user: { username: "calisan" } })

    const invalidChange = await app.inject({
      method: "POST",
      url: "/api/account/change-password",
      headers: { cookie },
      payload: { currentPassword: "calisan", newPassword: "yeni-parola", userId: "another-user" },
    })
    expect(invalidChange.statusCode).toBe(400)
    expect(invalidChange.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } })
  })
})
