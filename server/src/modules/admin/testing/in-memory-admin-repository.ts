import type { AdminRepository, PersistedAdminUserInput } from "../../../repositories/admin-repository.js"
import type { AdminUser, AuthorizationScope } from "../types.js"

const clone = <T>(value: T): T => structuredClone(value)

export class InMemoryAdminRepository implements AdminRepository {
  private sequence = 0
  private users: AdminUser[]
  readonly passwordHashes = new Map<string, string | null>()
  constructor(users: AdminUser[] = [], private readonly references = { companyIds: [] as string[], facilities: [] as { id: string; companyId: string }[], gates: [] as { id: string; facilityId: string; companyId: string }[] }) { this.users = clone(users) }
  async listUsers() { return clone(this.users) }
  async findUser(id: string) { const user = this.users.find((candidate) => candidate.id === id); return user ? clone(user) : null }
  async findUserByUsernameNormalized(value: string) { const user = this.users.find((candidate) => candidate.username.trim().toLowerCase() === value); return user ? clone(user) : null }
  async findUserByEmailNormalized(value: string) { const user = this.users.find((candidate) => candidate.email.trim().toLowerCase() === value); return user ? clone(user) : null }
  async countActiveAdmins(excludeUserId?: string) { return this.users.filter((user) => user.id !== excludeUserId && user.active && user.role === "ADMIN").length }
  async createLocalUser(input: PersistedAdminUserInput & { scope: AuthorizationScope }) { const now = new Date("2026-01-01T00:00:00.000Z").toISOString(); const user: AdminUser = { id: `user-${++this.sequence}`, fullName: input.fullName, username: input.username, email: input.email, authenticationSource: "LOCAL", role: input.role, authorizationScope: clone(input.scope), active: input.active, createdAt: now, updatedAt: now }; this.users.push(user); this.passwordHashes.set(user.id, input.passwordHash); return clone(user) }
  async updateUser(id: string, input: Partial<PersistedAdminUserInput> & { scope?: AuthorizationScope }) { const current = this.users.find((user) => user.id === id); if (!current) throw new Error("User not found"); const next: AdminUser = { ...current, ...(input.fullName !== undefined ? { fullName: input.fullName } : {}), ...(input.username !== undefined ? { username: input.username } : {}), ...(input.email !== undefined ? { email: input.email } : {}), ...(input.role !== undefined ? { role: input.role } : {}), ...(input.active !== undefined ? { active: input.active } : {}), ...(input.scope ? { authorizationScope: clone(input.scope) } : {}), updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString() }; this.users = this.users.map((user) => user.id === id ? next : user); return clone(next) }
  async updatePasswordHash(id: string, passwordHash: string) { if (!this.users.some((user) => user.id === id)) throw new Error("User not found"); this.passwordHashes.set(id, passwordHash) }
  async findScopeReferences(scope: AuthorizationScope) { return { companyIds: this.references.companyIds.filter((id) => scope.companyIds.includes(id)), facilities: this.references.facilities.filter((item) => scope.facilityIds.includes(item.id)), gates: this.references.gates.filter((item) => scope.securityGateIds.includes(item.id)) } }
}
