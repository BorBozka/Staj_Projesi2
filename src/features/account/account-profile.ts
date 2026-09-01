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

export const currentAccountProfiles = {
  employee: {
    id: "current-employee-maya-kara",
    fullName: "Maya Kara",
    initials: "MK",
    role: "EMPLOYEE",
    roleLabel: "Çalışan",
    authenticationSource: "LOCAL",
  },
  security: {
    id: "current-security-atahan-bozkurt",
    fullName: "Atahan Bozkurt",
    initials: "AB",
    role: "SECURITY",
    roleLabel: "Güvenlik",
    authenticationSource: "LOCAL",
  },
  manager: {
    id: "current-manager-atahan-bozkurt",
    fullName: "Atahan Bozkurt",
    initials: "AB",
    role: "MANAGER",
    roleLabel: "Yönetici",
    authenticationSource: "LOCAL",
  },
  admin: {
    id: "current-admin-atahan-bozkurt",
    fullName: "Atahan Bozkurt",
    initials: "AB",
    role: "ADMIN",
    roleLabel: "Admin",
    authenticationSource: "LOCAL",
  },
} satisfies Record<string, AccountProfile>
