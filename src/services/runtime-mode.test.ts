import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("VITE_APP_MODE runtime wiring", () => {
  it("uses Http services when the mode is api", async () => {
    vi.stubEnv("VITE_APP_MODE", "api")
    vi.resetModules()

    const [services, { HttpSessionService }] = await Promise.all([
      import("@/services"),
      import("@/services/http/http-session-service"),
    ])

    expect(services.sessionService).toBeInstanceOf(HttpSessionService)
  })

  it("uses Mock services when the mode is demo", async () => {
    vi.stubEnv("VITE_APP_MODE", "demo")
    vi.resetModules()

    const [services, { MockSessionService }] = await Promise.all([
      import("@/services"),
      import("@/services/mock-session-service"),
    ])

    expect(services.sessionService).toBeInstanceOf(MockSessionService)
  })

  it("fails startup for an invalid mode", async () => {
    vi.stubEnv("VITE_APP_MODE", "automatic")
    vi.resetModules()

    await expect(import("@/services")).rejects.toThrowError(
      'Invalid VITE_APP_MODE value "automatic". Expected "api" or "demo".',
    )
  })
})
