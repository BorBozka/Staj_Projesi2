import { afterEach, describe, expect, it, vi } from "vitest"

import { MockAccountService } from "@/services/mock-account-service"
import { MockSessionService } from "@/services/mock-session-service"

const storage = new Map<string, string>()

afterEach(() => {
  storage.clear()
  vi.unstubAllGlobals()
})

describe("MockAccountService", () => {
  it("persists avatars by immutable user id and removes them again", async () => {
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) }, dispatchEvent: vi.fn() })
    const service = new MockAccountService()
    await service.updateAvatar("user-42", "data:image/webp;base64,small")
    expect(await service.getAvatar("user-42")).toBe("data:image/webp;base64,small")
    await service.removeAvatar("user-42")
    expect(await service.getAvatar("user-42")).toBeUndefined()
  })

  it("does not pretend to verify credentials but rejects an empty current password", async () => {
    const service = new MockAccountService()
    await expect(service.changePassword({ userId: "user-42", currentPassword: "", newPassword: "password1" })).rejects.toThrow("Parola alanları boş olamaz.")
  })

  it("keeps logout behind a session boundary", async () => {
    const service = new MockSessionService()
    await expect(service.logout()).resolves.toBeUndefined()
  })
})
