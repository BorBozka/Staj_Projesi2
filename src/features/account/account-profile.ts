import type { ApplicationRole, AuthenticationSource } from "@/domain/admin"

export interface AccountProfile {
  id: string
  fullName: string
  initials: string
  role: ApplicationRole
  roleLabel: string
  authenticationSource: AuthenticationSource
  avatar?: string
}

export function toAccountProfile(session: AccountProfile): AccountProfile {
  return session
}
