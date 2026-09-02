import { describe, expect, it } from "vitest"

import { resolveAppMode } from "@/config/app-mode"

describe("resolveAppMode", () => {
  it("defaults to api mode", () => {
    expect(resolveAppMode(undefined)).toBe("api")
    expect(resolveAppMode("")).toBe("api")
  })

  it.each(["api", "demo"] as const)("accepts %s mode", (mode) => {
    expect(resolveAppMode(mode)).toBe(mode)
  })

  it("rejects invalid values instead of falling back", () => {
    expect(() => resolveAppMode("mock")).toThrowError(
      'Invalid VITE_APP_MODE value "mock". Expected "api" or "demo".',
    )
  })
})
