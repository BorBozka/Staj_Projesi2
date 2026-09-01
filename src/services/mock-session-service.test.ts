import { describe, expect, it } from "vitest"

import { MockAccountService } from "@/services/mock-account-service"
import { MockAuthenticationStore } from "@/services/mock-authentication-store"
import { MockSessionService } from "@/services/mock-session-service"

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe("MockSessionService", () => {
  it.each([
    ["calisan", "calisan", "EMPLOYEE"],
    ["yonetici", "yonetici", "MANAGER"],
    ["admin", "admin", "ADMIN"],
    ["guvenlik", "guvenlik", "SECURITY"],
  ])("authenticates the %s demo account", async (username, password, role) => {
    const service = new MockSessionService(new MockAuthenticationStore(), createStorage())
    await expect(service.login(username, password)).resolves.toMatchObject({ username, role })
  })

  it("rejects invalid credentials without distinguishing the failed field", async () => {
    const service = new MockSessionService(new MockAuthenticationStore(), createStorage())
    await expect(service.login("calisan", "yanlis")).rejects.toThrow("Kullanıcı adı veya şifre hatalı.")
  })

  it("hydrates the browser session and clears it on logout", async () => {
    const storage = createStorage()
    const service = new MockSessionService(new MockAuthenticationStore(), storage)
    await service.login("yonetici", "yonetici")
    await expect(service.getCurrentSession()).resolves.toMatchObject({ role: "MANAGER" })
    await service.logout()
    await expect(service.getCurrentSession()).resolves.toBeNull()
  })

  it("accepts the new in-memory password after a LOCAL password change", async () => {
    const store = new MockAuthenticationStore()
    const accountService = new MockAccountService(store)
    const service = new MockSessionService(store, createStorage())
    const user = await service.login("calisan", "calisan")
    await accountService.changePassword({ userId: user.id, currentPassword: "calisan", newPassword: "yeni-parola" })
    await service.logout()
    await expect(service.login("calisan", "calisan")).rejects.toThrow("Kullanıcı adı veya şifre hatalı.")
    await expect(service.login("calisan", "yeni-parola")).resolves.toMatchObject({ id: user.id })
  })
})
