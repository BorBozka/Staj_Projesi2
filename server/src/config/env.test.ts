import { describe, expect, it } from "vitest"

import { getDemoSeedUsers, shouldSeedDemoData } from "../../prisma/seed-data.js"
import { ConfigError, loadConfig } from "./env.js"

describe("server configuration", () => {
  it("fails clearly when DATABASE_URL is missing or not a SQL Server URL", () => {
    expect(() => loadConfig({ WEB_ORIGIN: "http://localhost:5173" })).toThrow(ConfigError)
    expect(() => loadConfig({ DATABASE_URL: "postgresql://localhost/test" })).toThrow("Prisma SQL Server")
  })

  it("parses the documented development configuration", () => {
    expect(loadConfig({
      API_PORT: "3001",
      WEB_ORIGIN: "http://localhost:5173",
      DATABASE_URL: "sqlserver://localhost:1433;database=visitor_operations;user=sa;password=not-a-secret;encrypt=true;trustServerCertificate=true",
      SESSION_COOKIE_NAME: "bplas_session",
      SESSION_TTL_HOURS: "8",
      NODE_ENV: "development",
      DEMO_SEED_ENABLED: "true",
    })).toMatchObject({ apiPort: 3001, sessionTtlHours: 8, demoSeedEnabled: true })
  })
})

describe("development demo seed definitions", () => {
  it("exposes the four demo credentials only with the explicit development flag", () => {
    expect(shouldSeedDemoData({ NODE_ENV: "production", DEMO_SEED_ENABLED: "true" })).toBe(false)
    expect(getDemoSeedUsers({ NODE_ENV: "production", DEMO_SEED_ENABLED: "true" })).toEqual([])
    expect(getDemoSeedUsers({ NODE_ENV: "development", DEMO_SEED_ENABLED: "false" })).toEqual([])
    expect(getDemoSeedUsers({ NODE_ENV: "development", DEMO_SEED_ENABLED: "true" }).map((user) => `${user.username}/${user.password}`)).toEqual([
      "calisan/calisan",
      "yonetici/yonetici",
      "admin/admin",
      "guvenlik/guvenlik",
    ])
  })
})
