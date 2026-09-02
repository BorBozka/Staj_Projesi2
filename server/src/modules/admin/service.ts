import { ApiError } from "../../lib/api-error.js"
import { normalizeIdentity } from "../../lib/names.js"
import { hashPassword } from "../../auth/password.js"
import type { AdminRepository, PersistedAdminUserInput } from "../../repositories/admin-repository.js"
import type { AdminUser, AuthorizationScope, CreateAdminUserInput, UpdateAdminUserInput } from "./types.js"

function uniqueIds(values: string[]) { return [...new Set(values)] }
function normalizedScope(scope: AuthorizationScope): AuthorizationScope { return { companyIds: uniqueIds(scope.companyIds), facilityIds: uniqueIds(scope.facilityIds), securityGateIds: uniqueIds(scope.securityGateIds) } }

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  listUsers() { return this.repository.listUsers() }
  async getUser(id: string) { return this.requireUser(id) }

  async createUser(input: CreateAdminUserInput): Promise<AdminUser> {
    const user = this.validateCreate(input)
    await this.assertIdentityAvailable(user.usernameNormalized, user.emailNormalized)
    await this.validateScope(input.role, input.authorizationScope)
    return this.repository.createLocalUser({ ...user, passwordHash: await hashPassword(input.password), scope: normalizedScope(input.authorizationScope) })
  }

  async updateUser(id: string, input: UpdateAdminUserInput, actingUserId: string): Promise<AdminUser> {
    const existing = await this.requireUser(id)
    const next = { fullName: input.fullName?.trim() ?? existing.fullName, username: input.username?.trim() ?? existing.username, email: input.email?.trim() ?? existing.email, role: input.role ?? existing.role, active: input.active ?? existing.active, authorizationScope: input.authorizationScope ?? existing.authorizationScope }
    if (!next.fullName || !next.username || !next.email) throw new ApiError(400, "VALIDATION_ERROR", "Ad soyad, kullanıcı adı ve e-posta zorunludur.")
    if (existing.authenticationSource === "ACTIVE_DIRECTORY" && (input.fullName !== undefined || input.username !== undefined || input.email !== undefined)) throw new ApiError(409, "IDENTITY_MANAGED_EXTERNALLY", "Active Directory kullanıcılarının kimlik alanları düzenlenemez.")
    if (id === actingUserId && existing.active && !next.active) throw new ApiError(409, "SELF_DEACTIVATION", "Kendi hesabınızı pasif hale getiremezsiniz.")
    if (id === actingUserId && existing.role === "ADMIN" && next.role !== "ADMIN") throw new ApiError(409, "SELF_ADMIN_DEMOTION", "Kendi Admin rolünüzü kaldıramazsınız.")
    if (existing.role === "ADMIN" && existing.active && (next.role !== "ADMIN" || !next.active) && await this.repository.countActiveAdmins(id) === 0) throw new ApiError(409, "LAST_ACTIVE_ADMIN", "Sistemde en az bir aktif Admin bulunmalıdır.")
    const usernameNormalized = normalizeIdentity(next.username)
    const emailNormalized = normalizeIdentity(next.email)
    await this.assertIdentityAvailable(usernameNormalized, emailNormalized, id)
    await this.validateScope(next.role, next.authorizationScope)
    const persisted: Partial<PersistedAdminUserInput> & { scope?: AuthorizationScope } = { role: next.role, active: next.active, scope: normalizedScope(next.authorizationScope) }
    if (existing.authenticationSource === "LOCAL") Object.assign(persisted, { fullName: next.fullName, username: next.username, usernameNormalized, email: next.email, emailNormalized })
    return this.repository.updateUser(id, persisted)
  }

  async resetLocalUserPassword(id: string, password: string): Promise<void> {
    const user = await this.requireUser(id)
    if (user.authenticationSource !== "LOCAL") throw new ApiError(409, "LOCAL_AUTH_REQUIRED", "Active Directory kullanıcıları için parola sıfırlama desteklenmiyor.")
    if (password.length < 8) throw new ApiError(400, "VALIDATION_ERROR", "Geçici parola en az sekiz karakter olmalıdır.")
    await this.repository.updatePasswordHash(id, await hashPassword(password))
  }

  private validateCreate(input: CreateAdminUserInput): Omit<PersistedAdminUserInput, "passwordHash"> {
    const fullName = input.fullName.trim(); const username = input.username.trim(); const email = input.email.trim()
    if (!fullName || !username || !email || input.password.length < 8) throw new ApiError(400, "VALIDATION_ERROR", "Ad soyad, kullanıcı adı, e-posta ve en az sekiz karakter parola zorunludur.")
    return { fullName, username, usernameNormalized: normalizeIdentity(username), email, emailNormalized: normalizeIdentity(email), role: input.role, active: input.active }
  }

  private async assertIdentityAvailable(usernameNormalized: string, emailNormalized: string, excludeId?: string) {
    const [username, email] = await Promise.all([this.repository.findUserByUsernameNormalized(usernameNormalized), this.repository.findUserByEmailNormalized(emailNormalized)])
    if (username && username.id !== excludeId) throw new ApiError(409, "USERNAME_TAKEN", "Bu kullanıcı adı zaten kullanılıyor.")
    if (email && email.id !== excludeId) throw new ApiError(409, "EMAIL_TAKEN", "Bu e-posta adresi zaten kullanılıyor.")
  }

  private async validateScope(role: AdminUser["role"], scope: AuthorizationScope) {
    const normalized = normalizedScope(scope)
    if (normalized.companyIds.length === 0) throw new ApiError(400, "VALIDATION_ERROR", "En az bir şirket kapsamı seçilmelidir.")
    const found = await this.repository.findScopeReferences(normalized)
    if (found.companyIds.length !== normalized.companyIds.length || found.facilities.length !== normalized.facilityIds.length || found.gates.length !== normalized.securityGateIds.length) throw new ApiError(400, "INVALID_SCOPE", "Kapsamda bilinmeyen organizasyon kaydı bulunuyor.")
    if (found.facilities.some((facility) => !normalized.companyIds.includes(facility.companyId)) || found.gates.some((gate) => !normalized.companyIds.includes(gate.companyId))) throw new ApiError(400, "INVALID_SCOPE", "Tesis ve güvenlik kapısı kapsamı seçili şirket kapsamıyla uyumlu olmalıdır.")
    void role
  }

  private async requireUser(id: string) { const user = await this.repository.findUser(id); if (!user) throw new ApiError(404, "NOT_FOUND", "Kullanıcı bulunamadı."); return user }
}
