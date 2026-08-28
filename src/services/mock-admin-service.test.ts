import { describe, expect, it } from "vitest"

import { MockAdminService } from "@/services/mock-admin-service"

const scope = (companyIds: string[]) => ({ companyIds, facilityIds: [], securityGateIds: [] })

describe("MockAdminService users", () => {
  it("keeps AD-owned identity fields immutable while allowing role and scope changes", async () => {
    const service = new MockAdminService()
    // Maya Kara: an AD user who is not the sole active Admin, so this exercises identity
    // immutability without tripping the self-lockout/last-admin guards tested separately below.
    const adUser = (await service.getUsers()).find((user) => user.username === "maya.kara")!
    const saved = await service.saveUser({ ...adUser, fullName: "Değiştirilemez", email: "changed@example.test", role: "EMPLOYEE", authorizationScope: scope(["company-2"]), active: false })
    expect(saved.fullName).toBe(adUser.fullName)
    expect(saved.email).toBe(adUser.email)
    expect(saved.role).toBe("EMPLOYEE")
    expect(saved.authorizationScope.companyIds).toEqual(["company-2"])
    expect(saved.active).toBe(false)
  })

  it("creates a local user without ever persisting a password field on the domain object", async () => {
    const service = new MockAdminService()
    const created = await service.saveUser({
      fullName: "Yeni Kullanıcı",
      username: "yeni.kullanici",
      email: "yeni.kullanici@bplas.com",
      authenticationSource: "LOCAL",
      role: "EMPLOYEE",
      authorizationScope: scope(["company-1"]),
      active: true,
    })
    expect(created.id).toBeTruthy()
    expect(Object.keys(created)).not.toContain("password")
    expect(Object.keys(created)).not.toContain("temporaryPassword")
    const users = await service.getUsers()
    expect(users.find((user) => user.id === created.id)).toEqual(created)
  })

  it("assigns a distinct id even when the create form submits the empty-string sentinel id used for a fresh draft", async () => {
    const service = new MockAdminService()
    const draft = { id: "", fullName: "Kullanıcı Bir", username: "kullanici.bir", email: "bir@bplas.com", authenticationSource: "LOCAL" as const, role: "EMPLOYEE" as const, authorizationScope: scope(["company-1"]), active: true }
    const first = await service.saveUser(draft)
    const second = await service.saveUser({ ...draft, fullName: "Kullanıcı İki", username: "kullanici.iki", email: "iki@bplas.com" })
    expect(first.id).not.toBe("")
    expect(second.id).not.toBe("")
    expect(first.id).not.toBe(second.id)
    const users = await service.getUsers()
    expect(users.filter((user) => user.username === "kullanici.bir" || user.username === "kullanici.iki")).toHaveLength(2)
  })

  it("rejects a duplicate username or email, case-insensitively, at the service boundary", async () => {
    const service = new MockAdminService()
    const draft = { fullName: "Çakışan Kullanıcı", username: "MAYA.KARA", email: "unique@bplas.com", authenticationSource: "LOCAL" as const, role: "EMPLOYEE" as const, authorizationScope: scope(["company-1"]), active: true }
    await expect(service.saveUser(draft)).rejects.toThrow("kullanıcı adı")
    await expect(service.saveUser({ ...draft, username: "unique.user", email: "MAYA.KARA@bplas.com" })).rejects.toThrow("e-posta")
  })

  it("does not flag a user's own current username/email as a conflict when editing", async () => {
    const service = new MockAdminService()
    const existing = (await service.getUsers()).find((user) => user.username === "selin.demir")!
    const saved = await service.saveUser({ ...existing, fullName: "Selin Demir Güncel" })
    expect(saved.fullName).toBe("Selin Demir Güncel")
  })

  it("requires at least one company in scope", async () => {
    const service = new MockAdminService()
    const draft = { fullName: "Kapsamsız Kullanıcı", username: "kapsamsiz", email: "kapsamsiz@bplas.com", authenticationSource: "LOCAL" as const, role: "EMPLOYEE" as const, authorizationScope: scope([]), active: true }
    await expect(service.saveUser(draft)).rejects.toThrow("şirket kapsamı")
  })

  it("blocks an Admin from deactivating or demoting their own account", async () => {
    const service = new MockAdminService()
    const self = (await service.getUsers()).find((user) => user.username === "atahan.bozkurt")!
    await expect(service.saveUser({ ...self, active: false }, { actingUserId: self.id })).rejects.toThrow("Kendi hesabınızı")
    await expect(service.saveUser({ ...self, role: "EMPLOYEE" }, { actingUserId: self.id })).rejects.toThrow("Kendi Admin rolünüzü")
  })

  it("blocks removing the last active Admin even when acting as someone else", async () => {
    const service = new MockAdminService()
    const lastAdmin = (await service.getUsers()).find((user) => user.username === "atahan.bozkurt")!
    await expect(service.saveUser({ ...lastAdmin, active: false }, { actingUserId: "someone-else" })).rejects.toThrow("aktif Admin")
    await expect(service.saveUser({ ...lastAdmin, role: "MANAGER" }, { actingUserId: "someone-else" })).rejects.toThrow("aktif Admin")
  })

  it("allows demoting/deactivating an Admin once another active Admin exists", async () => {
    const service = new MockAdminService()
    const users = await service.getUsers()
    const original = users.find((user) => user.username === "atahan.bozkurt")!
    await service.saveUser({ fullName: "İkinci Admin", username: "ikinci.admin", email: "ikinci.admin@bplas.com", authenticationSource: "LOCAL", role: "ADMIN", authorizationScope: scope(["company-1"]), active: true })
    const saved = await service.saveUser({ ...original, active: false }, { actingUserId: "someone-else" })
    expect(saved.active).toBe(false)
  })
})

describe("MockAdminService local password reset", () => {
  it("accepts a reset for a Local user without storing the password anywhere", async () => {
    const service = new MockAdminService()
    const localUser = (await service.getUsers()).find((user) => user.authenticationSource === "LOCAL")!
    await expect(service.resetLocalUserPassword(localUser.id, "longenough1")).resolves.toBeUndefined()
    const after = await service.getUsers()
    expect(Object.keys(after.find((user) => user.id === localUser.id)!)).not.toContain("password")
  })

  it("rejects resetting the password of an Active Directory user", async () => {
    const service = new MockAdminService()
    const adUser = (await service.getUsers()).find((user) => user.authenticationSource === "ACTIVE_DIRECTORY")!
    await expect(service.resetLocalUserPassword(adUser.id, "longenough1")).rejects.toThrow("Active Directory")
  })

  it("rejects an empty password even at the service boundary", async () => {
    const service = new MockAdminService()
    const localUser = (await service.getUsers()).find((user) => user.authenticationSource === "LOCAL")!
    await expect(service.resetLocalUserPassword(localUser.id, "   ")).rejects.toThrow("boş olamaz")
  })

  it("rejects resetting a password for an unknown user", async () => {
    const service = new MockAdminService()
    await expect(service.resetLocalUserPassword("no-such-user", "longenough1")).rejects.toThrow("bulunamadı")
  })
})

describe("MockAdminService other admin resources", () => {
  it("enforces normalized visit type uniqueness at the service boundary", async () => {
    const service = new MockAdminService()
    const existing = (await service.getVisitTypes()).find((item) => item.name === "Toplantı")!

    await expect(service.saveVisitType({ name: "Toplantı", active: true })).rejects.toThrow("Bu ziyaret türü zaten tanımlı.")
    await expect(service.saveVisitType({ name: "TOPLANTI", active: true })).rejects.toThrow("Bu ziyaret türü zaten tanımlı.")
    await expect(service.saveVisitType({ name: " toplantı ", active: true })).rejects.toThrow("Bu ziyaret türü zaten tanımlı.")
    await expect(service.saveVisitType({ ...existing, active: false })).resolves.toMatchObject({ id: existing.id, active: false })

    const created = await service.saveVisitType({ name: "  Resmi ziyaret  ", active: true })
    expect(created.name).toBe("Resmi ziyaret")
  })

  it("publishes new immutable visitor-rule versions instead of mutating history", async () => {
    const service = new MockAdminService()
    const before = await service.getVisitorRuleVersions()
    const historical = before.find((rule) => !rule.active)!
    const published = await service.publishVisitorRule("Yeni ziyaretçi kuralı")
    const after = await service.getVisitorRuleVersions()
    expect(published.version).toBeGreaterThan(before[0].version)
    expect(after.find((rule) => rule.id === historical.id)).toEqual(historical)
    expect(after.find((rule) => rule.id === before.find((rule) => rule.active)?.id)?.active).toBe(false)
    expect(after.find((rule) => rule.id === published.id)?.active).toBe(true)
  })

  it("rejects manual release of an in-use card", async () => {
    const service = new MockAdminService()
    const card = (await service.getVisitorCards()).find((item) => item.status === "IN_USE")!
    await expect(service.changeVisitorCardStatus(card.id, "AVAILABLE")).rejects.toThrow("operasyonel iade")
  })

  it("leaves not-returned cards to the Security return workflow", async () => {
    const service = new MockAdminService()
    const card = (await service.getVisitorCards()).find((item) => item.status === "NOT_RETURNED")!
    await expect(service.changeVisitorCardStatus(card.id, "AVAILABLE")).rejects.toThrow("Security operasyonu")
  })
})
