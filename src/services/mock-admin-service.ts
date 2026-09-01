import {
  isAdminEmailTaken,
  isAdminUsernameTaken,
  isAdminManagedVisitorCard,
  canMarkVisitorCardLost,
  canRestoreVisitorCard,
  isOperationalSettingsValid,
  isAuthorizationScopeValid,
  isVisitorCardNumberTaken,
  isSelfAdminDemotionAttempt,
  isSelfDeactivationAttempt,
  wouldRemoveLastActiveAdmin,
  DEFAULT_OVERDUE_TOLERANCE_MINUTES,
  type AdminUser,
  type CreateVisitorCardInput,
  type OperationalSettings,
  type OrganizationEntity,
  type OrganizationKind,
  type UpdateVisitorCardInventoryInput,
  type VisitTypeDefinition,
  type VisitorCardInventoryItem,
  type VisitorRuleVersion,
} from "@/domain/admin"
import type { AdminService, SaveAdminUserOptions } from "@/services/admin-service"
import { MockOrganizationStore } from "@/services/mock-organization-store"
import { MockVisitTypeStore } from "@/services/mock-visit-type-store"
import { MockVisitorCardStore } from "@/services/mock-visitor-card-store"
import { MockVisitorRuleStore } from "@/services/mock-visitor-rule-store"

const clone = <T,>(value: T): T => structuredClone(value)
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export class MockAdminService implements AdminService {
  private users: AdminUser[] = [
    { id: "user-1", fullName: "Atahan Bozkurt", username: "atahan.bozkurt", email: "atahan.bozkurt@bplas.com", authenticationSource: "ACTIVE_DIRECTORY", role: "ADMIN", authorizationScope: { companyIds: ["bplas", "bplas-otomotiv"], facilityIds: [], securityGateIds: [] }, active: true },
    { id: "user-2", fullName: "Maya Kara", username: "maya.kara", email: "maya.kara@bplas.com", authenticationSource: "ACTIVE_DIRECTORY", role: "MANAGER", authorizationScope: { companyIds: ["bplas"], facilityIds: [], securityGateIds: [] }, active: true },
    { id: "user-3", fullName: "Selin Demir", username: "selin.demir", email: "selin.demir@bplas.com", authenticationSource: "LOCAL", role: "SECURITY", authorizationScope: { companyIds: ["bplas"], facilityIds: [], securityGateIds: [] }, active: true },
    { id: "user-4", fullName: "Orhan Yalçın", username: "orhan.yalcin", email: "orhan.yalcin@bplas.com", authenticationSource: "LOCAL", role: "EMPLOYEE", authorizationScope: { companyIds: ["bplas-otomotiv"], facilityIds: [], securityGateIds: [] }, active: false },
    { id: "user-5", fullName: "Deniz Acar", username: "deniz.acar", email: "deniz.acar@bplas.com", authenticationSource: "ACTIVE_DIRECTORY", role: "EMPLOYEE", authorizationScope: { companyIds: ["bplas"], facilityIds: [], securityGateIds: [] }, active: true },
  ]
  private settings: OperationalSettings = { overdueToleranceMinutes: DEFAULT_OVERDUE_TOLERANCE_MINUTES, overdueAlertRepeatMinutes: 10, workdayEndTime: "18:15" }

  constructor(
    private readonly organizationStore = new MockOrganizationStore(),
    initialRules: VisitorRuleVersion[] = [{ id: "rule-2", version: 2, content: "Ziyaretçiler tesis güvenlik kurallarına ve yönlendirmelerine uymayı kabul eder.", publishedAt: "2026-08-01T09:30:00.000Z", active: true }, { id: "rule-1", version: 1, content: "Ziyaretçiler tesis kurallarına uyacağını kabul eder.", publishedAt: "2026-02-01T09:20:00.000Z", active: false }],
    private readonly visitTypeStore = new MockVisitTypeStore(),
    private readonly cardStore: MockVisitorCardStore = new MockVisitorCardStore(),
    private readonly ruleStore: MockVisitorRuleStore = new MockVisitorRuleStore(initialRules),
  ) {}

  async getUsers() { return clone(this.users) }
  async saveUser(input: Omit<AdminUser, "id"> & { id?: string }, options: SaveAdminUserOptions = {}) {
    const existing = input.id ? this.users.find((user) => user.id === input.id) : undefined
    const excludeId = existing?.id ?? null
    if (isAdminUsernameTaken(this.users, excludeId, input.username)) throw new Error("Bu kullanıcı adı zaten kullanılıyor.")
    if (isAdminEmailTaken(this.users, excludeId, input.email)) throw new Error("Bu e-posta adresi zaten kullanılıyor.")
    if (!isAuthorizationScopeValid(input.role, input.authorizationScope)) throw new Error("En az bir şirket kapsamı seçilmelidir.")
    if (existing) {
      const actingUserId = options.actingUserId ?? null
      if (isSelfDeactivationAttempt(actingUserId, existing, input.active)) throw new Error("Kendi hesabınızı pasif hale getiremezsiniz.")
      if (isSelfAdminDemotionAttempt(actingUserId, existing, input.role)) throw new Error("Kendi Admin rolünüzü kaldıramazsınız.")
      if (wouldRemoveLastActiveAdmin(this.users, existing, input.role, input.active)) throw new Error("Sistemde en az bir aktif Admin bulunmalıdır.")
    }
    // AD-owned identity fields intentionally remain immutable at the service boundary.
    const user: AdminUser = existing?.authenticationSource === "ACTIVE_DIRECTORY"
      ? { ...existing, role: input.role, authorizationScope: input.authorizationScope, active: input.active }
      : { ...input, id: input.id || id("user") }
    if (existing) this.users = this.users.map((item) => item.id === user.id ? user : item)
    else this.users = [user, ...this.users]
    return clone(user)
  }
  async resetLocalUserPassword(userId: string, newPassword: string) {
    const user = this.users.find((item) => item.id === userId)
    if (!user) throw new Error("Kullanıcı bulunamadı.")
    if (user.authenticationSource !== "LOCAL") throw new Error("Active Directory kullanıcıları için parola sıfırlama desteklenmiyor.")
    if (!newPassword.trim()) throw new Error("Geçici parola boş olamaz.")
    // Never stored: a real backend would hash newPassword and forward it to an auth service.
  }
  async getOrganization() { return this.organizationStore.getSnapshot() }
  async saveOrganizationEntity(kind: OrganizationKind, input: Omit<OrganizationEntity, "id"> & { id?: string }) {
    return this.organizationStore.save(kind, input)
  }
  async getVisitTypes() { return this.visitTypeStore.getAll() }
  async saveVisitType(input: Omit<VisitTypeDefinition, "id"> & { id?: string }) {
    return this.visitTypeStore.save(input)
  }
  async getVisitorCards() { return this.cardStore.list() }
  async createVisitorCard(input: CreateVisitorCardInput) {
    const cardNumber = input.cardNumber.trim()
    if (!cardNumber) throw new Error("Kart numarası boş olamaz.")
    if (isVisitorCardNumberTaken(this.cardStore.list(), null, cardNumber)) throw new Error("Bu kart numarası zaten tanımlı.")
    const entity: VisitorCardInventoryItem = { id: id("card"), cardNumber, status: "AVAILABLE" }
    return this.cardStore.insert(entity)
  }
  async updateVisitorCardInventory(idValue: string, input: UpdateVisitorCardInventoryInput) {
    const existing = this.cardStore.get(idValue)
    if (!existing) throw new Error("Kart bulunamadı.")
    if (!isAdminManagedVisitorCard(existing)) throw new Error("Bu kartın durumu Security operasyonu tarafından yönetilir.")
    const cardNumber = input.cardNumber.trim()
    if (!cardNumber) throw new Error("Kart numarası boş olamaz.")
    if (isVisitorCardNumberTaken(this.cardStore.list(), existing.id, cardNumber)) throw new Error("Bu kart numarası zaten tanımlı.")
    const entity: VisitorCardInventoryItem = { ...existing, cardNumber, status: input.active ? "AVAILABLE" : "DISABLED" }
    return this.cardStore.replace(existing.id, entity)
  }
  async markVisitorCardLost(idValue: string) {
    const existing = this.cardStore.get(idValue)
    if (!existing) throw new Error("Kart bulunamadı.")
    if (!canMarkVisitorCardLost(existing)) throw new Error("Yalnız iade edilmemiş kartlar kayıp olarak işaretlenebilir.")
    // Keep assignedVisitorName: who held the card is the write-off record's key detail.
    const entity: VisitorCardInventoryItem = { ...existing, status: "LOST" }
    return this.cardStore.replace(existing.id, entity)
  }
  async restoreVisitorCard(idValue: string) {
    const existing = this.cardStore.get(idValue)
    if (!existing) throw new Error("Kart bulunamadı.")
    if (!canRestoreVisitorCard(existing)) throw new Error("Yalnız kayıp kartlar envantere geri alınabilir.")
    // Drop assignedVisitorName: the card is physically back in inventory, held by no one.
    const entity: VisitorCardInventoryItem = { id: existing.id, cardNumber: existing.cardNumber, status: "AVAILABLE" }
    return this.cardStore.replace(existing.id, entity)
  }
  async getVisitorRuleVersions() { return this.ruleStore.getAll() }
  async publishVisitorRule(content: string) { return this.ruleStore.publish(content) }
  async getOperationalSettings() { return clone(this.settings) }
  async saveOperationalSettings(settings: OperationalSettings) {
    if (!isOperationalSettingsValid(settings)) throw new Error("Operasyon parametreleri geçersiz.")
    this.settings = clone(settings)
    return clone(this.settings)
  }
}
