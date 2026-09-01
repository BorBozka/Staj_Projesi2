export const applicationRoles = ["MANAGER", "ADMIN", "SECURITY", "EMPLOYEE"] as const
export type ApplicationRole = (typeof applicationRoles)[number]

export const authenticationSources = ["ACTIVE_DIRECTORY", "LOCAL"] as const
export type AuthenticationSource = (typeof authenticationSources)[number]

export interface AuthUserRecord {
  id: string
  username: string
  fullName: string
  role: ApplicationRole
  authenticationSource: AuthenticationSource
  active: boolean
  passwordHash: string | null
}

export interface SessionRecord {
  id: string
  userId: string
  tokenHash: string
  createdAt: Date
  expiresAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

export interface SessionWithUser extends SessionRecord {
  user: AuthUserRecord
}

export interface SessionUser {
  id: string
  username: string
  fullName: string
  initials: string
  role: ApplicationRole
  roleLabel: string
  authenticationSource: AuthenticationSource
}

export const roleLabels: Record<ApplicationRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Yönetici",
  SECURITY: "Güvenlik",
  EMPLOYEE: "Çalışan",
}

export function toSessionUser(user: AuthUserRecord): SessionUser {
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    initials,
    role: user.role,
    roleLabel: roleLabels[user.role],
    authenticationSource: user.authenticationSource,
  }
}
