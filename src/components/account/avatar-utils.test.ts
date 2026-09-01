import { describe, expect, it } from "vitest"

import { isSupportedAvatarFile } from "@/components/account/avatar-utils"

describe("avatar file selection", () => {
  it("accepts only the compact profile-photo formats", () => {
    expect(isSupportedAvatarFile({ type: "image/jpeg" })).toBe(true)
    expect(isSupportedAvatarFile({ type: "image/png" })).toBe(true)
    expect(isSupportedAvatarFile({ type: "image/webp" })).toBe(true)
    expect(isSupportedAvatarFile({ type: "image/gif" })).toBe(false)
    expect(isSupportedAvatarFile({ type: "text/plain" })).toBe(false)
  })
})
