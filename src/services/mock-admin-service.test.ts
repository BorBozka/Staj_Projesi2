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
    const active = before.find((rule) => rule.active)!
    const historical = before.find((rule) => !rule.active)!
    const published = await service.publishVisitorRule("  Yeni ziyaretçi kuralı  ")
    const after = await service.getVisitorRuleVersions()
    expect(published).toMatchObject({ version: 3, content: "Yeni ziyaretçi kuralı", active: true })
    expect(after.find((rule) => rule.id === historical.id)).toEqual(historical)
    expect(after.find((rule) => rule.id === active.id)).toEqual({ ...active, active: false })
    expect(after.find((rule) => rule.id === published.id)?.active).toBe(true)
    expect(after.filter((rule) => rule.active)).toHaveLength(1)
  })

  it("rejects blank visitor rules at the service boundary", async () => {
    const service = new MockAdminService()
    await expect(service.publishVisitorRule("")).rejects.toThrow("Ziyaretçi kuralı boş bırakılamaz.")
    await expect(service.publishVisitorRule("   ")).rejects.toThrow("Ziyaretçi kuralı boş bırakılamaz.")
  })

  it("starts an empty rule repository at v1 and calculates later versions from the maximum version", async () => {
    const emptyService = new MockAdminService(undefined, [])
    await expect(emptyService.publishVisitorRule("İlk kural")).resolves.toMatchObject({ version: 1, active: true })

    const unordered: import("@/domain/admin").VisitorRuleVersion[] = [
      { id: "rule-4", version: 4, content: "v4", createdAt: "2026-04-01", publishedAt: "2026-04-01", active: false },
      { id: "rule-2", version: 2, content: "v2", createdAt: "2026-02-01", publishedAt: "2026-02-01", active: true },
    ]
    const service = new MockAdminService(undefined, unordered)
    await expect(service.publishVisitorRule("Yeni kural")).resolves.toMatchObject({ version: 5, active: true })
  })

  it("persists only valid operational settings at the service boundary", async () => {
    const service = new MockAdminService()
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: 0, overdueAlertRepeatMinutes: 1 })).resolves.toEqual({ overdueToleranceMinutes: 0, overdueAlertRepeatMinutes: 1 })
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: -1, overdueAlertRepeatMinutes: 10 })).rejects.toThrow("Operasyon parametreleri geçersiz.")
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 0 })).rejects.toThrow("Operasyon parametreleri geçersiz.")
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: 1.5, overdueAlertRepeatMinutes: 10 })).rejects.toThrow("Operasyon parametreleri geçersiz.")
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 2.5 })).rejects.toThrow("Operasyon parametreleri geçersiz.")
  })

  it("keeps card inventory creation and editing inside the Admin-owned lifecycle", async () => {
    const service = new MockAdminService()
    const created = await service.createVisitorCard({ cardNumber: " 006 ", status: "LOST" } as never)
    expect(created).toMatchObject({ cardNumber: "006", status: "AVAILABLE" })

    const available = (await service.getVisitorCards()).find((item) => item.cardNumber === "001")!
    const disabled = await service.updateVisitorCardInventory(available.id, { cardNumber: available.cardNumber, active: false })
    expect(disabled.status).toBe("DISABLED")
    await expect(service.updateVisitorCardInventory(disabled.id, { cardNumber: disabled.cardNumber, active: true })).resolves.toMatchObject({ status: "AVAILABLE" })
  })

  it("rejects duplicate card numbers while preserving distinct leading-zero identifiers", async () => {
    const service = new MockAdminService()
    await expect(service.createVisitorCard({ cardNumber: " 001 " })).rejects.toThrow("Bu kart numarası zaten tanımlı.")
    await expect(service.createVisitorCard({ cardNumber: "ABC-01" })).resolves.toMatchObject({ cardNumber: "ABC-01" })
    await expect(service.createVisitorCard({ cardNumber: "abc-01" })).rejects.toThrow("Bu kart numarası zaten tanımlı.")
    await expect(service.createVisitorCard({ cardNumber: "01" })).resolves.toMatchObject({ cardNumber: "01" })
    const existing = (await service.getVisitorCards()).find((item) => item.cardNumber === "001")!
    await expect(service.updateVisitorCardInventory(existing.id, { cardNumber: "001", active: true })).resolves.toMatchObject({ id: existing.id })
  })

  it("rejects every operational-card mutation through the Admin inventory boundary", async () => {
    const service = new MockAdminService()
    const cards = await service.getVisitorCards()
    const available = cards.find((card) => card.status === "AVAILABLE")!
    const inUse = cards.find((card) => card.status === "IN_USE")!
    const notReturned = cards.find((card) => card.status === "NOT_RETURNED")!
    const lost = cards.find((card) => card.status === "LOST")!

    await expect(service.updateVisitorCardInventory(available.id, { cardNumber: available.cardNumber, active: true, status: "IN_USE" } as never)).resolves.toMatchObject({ status: "AVAILABLE" })
    await expect(service.updateVisitorCardInventory(available.id, { cardNumber: available.cardNumber, active: true, status: "NOT_RETURNED" } as never)).resolves.toMatchObject({ status: "AVAILABLE" })
    await expect(service.updateVisitorCardInventory(available.id, { cardNumber: available.cardNumber, active: true, status: "LOST" } as never)).resolves.toMatchObject({ status: "AVAILABLE" })
    await expect(service.updateVisitorCardInventory(inUse.id, { cardNumber: inUse.cardNumber, active: true })).rejects.toThrow("Security operasyonu")
    await expect(service.updateVisitorCardInventory(notReturned.id, { cardNumber: notReturned.cardNumber, active: true })).rejects.toThrow("Security operasyonu")
    await expect(service.updateVisitorCardInventory(lost.id, { cardNumber: lost.cardNumber, active: false })).rejects.toThrow("Security operasyonu")
  })

  it("preserves operational visitor assignments and isolates inventory edits", async () => {
    const service = new MockAdminService()
    const before = await service.getVisitorCards()
    const operational = before.find((card) => card.status === "IN_USE")!
    const available = before.find((card) => card.status === "AVAILABLE")!
    await service.updateVisitorCardInventory(available.id, { cardNumber: "010", active: false })
    const after = await service.getVisitorCards()
    expect(after.find((card) => card.id === operational.id)).toEqual(operational)
    expect(after.find((card) => card.id === available.id)).toMatchObject({ cardNumber: "010", status: "DISABLED" })
  })
})
