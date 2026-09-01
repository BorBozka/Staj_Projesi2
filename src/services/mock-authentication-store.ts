import type { AuthenticationSource, ApplicationRole } from "@/domain/admin"

export interface MockAuthenticationUser {
  id: string
  username: string
  fullName: string
  initials: string
  role: ApplicationRole
  roleLabel: string
  authenticationSource: AuthenticationSource
}

interface CredentialRecord {
  user: MockAuthenticationUser
  password: string
}

const demoCredentials: CredentialRecord[] = [
  { user: { id: "current-employee-maya-kara", username: "calisan", fullName: "Maya Kara", initials: "MK", role: "EMPLOYEE", roleLabel: "Çalışan", authenticationSource: "LOCAL" }, password: "calisan" },
  { user: { id: "current-manager-atahan-bozkurt", username: "yonetici", fullName: "Atahan Bozkurt", initials: "AB", role: "MANAGER", roleLabel: "Yönetici", authenticationSource: "LOCAL" }, password: "yonetici" },
  { user: { id: "current-admin-atahan-bozkurt", username: "admin", fullName: "Atahan Bozkurt", initials: "AB", role: "ADMIN", roleLabel: "Admin", authenticationSource: "LOCAL" }, password: "admin" },
  { user: { id: "current-security-atahan-bozkurt", username: "guvenlik", fullName: "Atahan Bozkurt", initials: "AB", role: "SECURITY", roleLabel: "Güvenlik", authenticationSource: "LOCAL" }, password: "guvenlik" },
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
