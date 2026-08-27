import {
  isAdminEmailTaken,
  isAdminUsernameTaken,
  isAuthorizationScopeValid,
  isSelfAdminDemotionAttempt,
  isSelfDeactivationAttempt,
  wouldRemoveLastActiveAdmin,
  type AdminUser,
  type OperationalSettings,
  type OrganizationEntity,
  type OrganizationKind,
  type VisitTypeDefinition,
  type VisitorCardInventoryItem,
  type VisitorCardStatus,
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
  private rules: VisitorRuleVersion[] = [{ id: "rule-2", version: 2, content: "Ziyaretçiler tesis güvenlik kurallarına ve yönlendirmelerine uymayı kabul eder.", createdAt: "2026-08-01T09:00:00.000Z", publishedAt: "2026-08-01T09:30:00.000Z", active: true }, { id: "rule-1", version: 1, content: "Ziyaretçiler tesis kurallarına uyacağını kabul eder.", createdAt: "2026-02-01T09:00:00.000Z", publishedAt: "2026-02-01T09:20:00.000Z", active: false }]
  private settings: OperationalSettings = { overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 10 }

  constructor(private readonly organizationStore = new MockOrganizationStore()) {}

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
    const entity: VisitTypeDefinition = { ...input, id: input.id ?? id("type") }
    this.visitTypes = input.id ? this.visitTypes.map((item) => item.id === input.id ? entity : item) : [...this.visitTypes, entity]
    return clone(entity)
  }
  async getVisitorCards() { return clone(this.cards) }
  async saveVisitorCard(input: Omit<VisitorCardInventoryItem, "id"> & { id?: string }) {
    const entity: VisitorCardInventoryItem = { ...input, id: input.id ?? id("card") }
    this.cards = input.id ? this.cards.map((item) => item.id === input.id ? entity : item) : [...this.cards, entity]
    return clone(entity)
  }
  async changeVisitorCardStatus(idValue: string, status: VisitorCardStatus) {
    const card = this.cards.find((item) => item.id === idValue)
    if (!card) throw new Error("Kart bulunamadı.")
    if (card.status === "IN_USE" && status !== "IN_USE") throw new Error("Kullanımdaki kart operasyonel iade olmadan değiştirilemez.")
    if (card.status === "NOT_RETURNED" && status !== "NOT_RETURNED") throw new Error("İade edilmemiş kart yalnızca Security operasyonu ile çözülebilir.")
    if (status === "AVAILABLE" && (card.status === "LOST" || card.status === "DISABLED")) card.assignedVisitorName = undefined
    card.status = status
    return clone(card)
  }
  async getVisitorRuleVersions() { return clone(this.rules) }
  async publishVisitorRule(content: string) {
    const next: VisitorRuleVersion = { id: id("rule"), version: Math.max(...this.rules.map((item) => item.version)) + 1, content, createdAt: new Date().toISOString(), publishedAt: new Date().toISOString(), active: true }
    this.rules = [next, ...this.rules.map((item) => ({ ...item, active: false }))]
    return clone(next)
  }
  async getOperationalSettings() { return clone(this.settings) }
  async saveOperationalSettings(settings: OperationalSettings) { this.settings = clone(settings); return clone(this.settings) }
}
