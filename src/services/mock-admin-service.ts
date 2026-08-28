import {
  isAdminEmailTaken,
  isAdminUsernameTaken,
  isAdminManagedVisitorCard,
  isAuthorizationScopeValid,
  isVisitorCardNumberTaken,
  isVisitTypeNameTaken,
  isSelfAdminDemotionAttempt,
  isSelfDeactivationAttempt,
  wouldRemoveLastActiveAdmin,
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
  private visitTypes: VisitTypeDefinition[] = [{ id: "type-1", name: "Toplantı", active: true }, { id: "type-2", name: "Teknik Servis / Bakım", active: true }, { id: "type-3", name: "Tedarikçi", active: true }, { id: "type-4", name: "İş Görüşmesi", active: false }]
  private cards: VisitorCardInventoryItem[] = [{ id: "card-1", cardNumber: "001", status: "AVAILABLE" }, { id: "card-2", cardNumber: "002", status: "IN_USE", assignedVisitorName: "Ece Korkmaz" }, { id: "card-3", cardNumber: "003", status: "NOT_RETURNED", assignedVisitorName: "Can Uslu" }, { id: "card-4", cardNumber: "004", status: "LOST" }, { id: "card-5", cardNumber: "005", status: "DISABLED" }]
  private rules: VisitorRuleVersion[]
  private settings: OperationalSettings = { overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 10 }

  constructor(private readonly organizationStore = new MockOrganizationStore(), initialRules: VisitorRuleVersion[] = [{ id: "rule-2", version: 2, content: "Ziyaretçiler tesis güvenlik kurallarına ve yönlendirmelerine uymayı kabul eder.", createdAt: "2026-08-01T09:00:00.000Z", publishedAt: "2026-08-01T09:30:00.000Z", active: true }, { id: "rule-1", version: 1, content: "Ziyaretçiler tesis kurallarına uyacağını kabul eder.", createdAt: "2026-02-01T09:00:00.000Z", publishedAt: "2026-02-01T09:20:00.000Z", active: false }]) { this.rules = clone(initialRules) }

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
  async getVisitTypes() { return clone(this.visitTypes) }
  async saveVisitType(input: Omit<VisitTypeDefinition, "id"> & { id?: string }) {
    const name = input.name.trim()
    if (!name) throw new Error("Ziyaret türü adı boş olamaz.")
    const existing = input.id ? this.visitTypes.find((item) => item.id === input.id) : undefined
    if (input.id && !existing) throw new Error("Ziyaret türü bulunamadı.")
    if (isVisitTypeNameTaken(this.visitTypes, existing?.id ?? null, name)) throw new Error("Bu ziyaret türü zaten tanımlı.")
    const entity: VisitTypeDefinition = { ...input, name, id: input.id || id("type") }
    this.visitTypes = existing ? this.visitTypes.map((item) => item.id === entity.id ? entity : item) : [...this.visitTypes, entity]
    return clone(entity)
  }
  async getVisitorCards() { return clone(this.cards) }
  async createVisitorCard(input: CreateVisitorCardInput) {
    const cardNumber = input.cardNumber.trim()
    if (!cardNumber) throw new Error("Kart numarası boş olamaz.")
    if (isVisitorCardNumberTaken(this.cards, null, cardNumber)) throw new Error("Bu kart numarası zaten tanımlı.")
    const entity: VisitorCardInventoryItem = { id: id("card"), cardNumber, status: "AVAILABLE" }
    this.cards = [...this.cards, entity]
    return clone(entity)
  }
  async updateVisitorCardInventory(idValue: string, input: UpdateVisitorCardInventoryInput) {
    const existing = this.cards.find((card) => card.id === idValue)
    if (!existing) throw new Error("Kart bulunamadı.")
    if (!isAdminManagedVisitorCard(existing)) throw new Error("Bu kartın durumu Security operasyonu tarafından yönetilir.")
    const cardNumber = input.cardNumber.trim()
    if (!cardNumber) throw new Error("Kart numarası boş olamaz.")
    if (isVisitorCardNumberTaken(this.cards, existing.id, cardNumber)) throw new Error("Bu kart numarası zaten tanımlı.")
    const entity: VisitorCardInventoryItem = { ...existing, cardNumber, status: input.active ? "AVAILABLE" : "DISABLED" }
    this.cards = this.cards.map((card) => card.id === existing.id ? entity : card)
    return clone(entity)
  }
  async getVisitorRuleVersions() { return clone(this.rules) }
  async publishVisitorRule(content: string) {
    const normalizedContent = content.trim()
    if (!normalizedContent) throw new Error("Ziyaretçi kuralı boş bırakılamaz.")
    const nextVersion = this.rules.reduce((maximum, item) => Math.max(maximum, item.version), 0) + 1
    const now = new Date().toISOString()
    const next: VisitorRuleVersion = { id: id("rule"), version: nextVersion, content: normalizedContent, createdAt: now, publishedAt: now, active: true }
    this.rules = [next, ...this.rules.map((item) => ({ ...item, active: false }))]
    return clone(next)
  }
  async getOperationalSettings() { return clone(this.settings) }
  async saveOperationalSettings(settings: OperationalSettings) { this.settings = clone(settings); return clone(this.settings) }
}
