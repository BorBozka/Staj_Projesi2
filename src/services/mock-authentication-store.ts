import type { AuthenticationSource, ApplicationRole, AuthorizationScope } from "@/domain/admin"

export interface MockAuthenticationUser {
  id: string
  username: string
  fullName: string
  initials: string
  role: ApplicationRole
  roleLabel: string
  authenticationSource: AuthenticationSource
  /** Linked employee id, or `null` for an account with no employee row (Admin/Security desk). */
  employeeId: string | null
  /** Assigned company/facility scope, mirroring the API session's `authorizationScope`. */
  authorizationScope: AuthorizationScope
}

const bplasMerkezScope: AuthorizationScope = { companyIds: ["bplas"], facilityIds: ["bplas-merkez"], securityGateIds: [] }

interface CredentialRecord {
  user: MockAuthenticationUser
  password: string
}

const demoCredentials: CredentialRecord[] = [
  { user: { id: "current-employee-maya-kara", username: "calisan", fullName: "Maya Kara", initials: "MK", role: "EMPLOYEE", roleLabel: "Çalışan", authenticationSource: "LOCAL", employeeId: "maya-kara", authorizationScope: bplasMerkezScope }, password: "calisan" },
  { user: { id: "current-manager-atahan-bozkurt", username: "yonetici", fullName: "Atahan Bozkurt", initials: "AB", role: "MANAGER", roleLabel: "Yönetici", authenticationSource: "LOCAL", employeeId: "eda-karaca", authorizationScope: bplasMerkezScope }, password: "yonetici" },
  { user: { id: "current-admin-atahan-bozkurt", username: "admin", fullName: "Atahan Bozkurt", initials: "AB", role: "ADMIN", roleLabel: "Admin", authenticationSource: "LOCAL", employeeId: null, authorizationScope: bplasMerkezScope }, password: "admin" },
  { user: { id: "current-security-atahan-bozkurt", username: "guvenlik", fullName: "Atahan Bozkurt", initials: "AB", role: "SECURITY", roleLabel: "Güvenlik", authenticationSource: "LOCAL", employeeId: null, authorizationScope: bplasMerkezScope }, password: "guvenlik" },
]

const clone = <T,>(value: T): T => structuredClone(value)

/**
 * Mock-only credential store. Passwords deliberately remain in memory: the browser session
 * persists the signed-in user, never the credential. A backend adapter can replace this store
 * without changing login components or the session contract.
 */
export class MockAuthenticationStore {
  private credentials = clone(demoCredentials)

  authenticate(username: string, password: string): MockAuthenticationUser | null {
    const record = this.credentials.find((item) => item.user.username === username.trim())
    return record && record.password === password ? clone(record.user) : null
  }

  changePassword(userId: string, currentPassword: string, newPassword: string) {
    const record = this.credentials.find((item) => item.user.id === userId)
    if (!record || record.user.authenticationSource !== "LOCAL" || record.password !== currentPassword) {
      throw new Error("Mevcut şifre hatalı.")
    }
    record.password = newPassword
  }
}
