import { applicationRoles, parseApplicationRole, type ApplicationRole } from "../../auth/auth-types.js"

export { applicationRoles, type ApplicationRole }

export interface AuthorizationScope {
  companyIds: string[]
  facilityIds: string[]
  securityGateIds: string[]
}

export interface AdminUser {
  id: string
  fullName: string
  username: string
  email: string
  authenticationSource: "LOCAL" | "ACTIVE_DIRECTORY"
  role: ApplicationRole
  authorizationScope: AuthorizationScope
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAdminUserInput {
  fullName: string
  username: string
  email: string
  password: string
  role: ApplicationRole
  authorizationScope: AuthorizationScope
  active: boolean
}

export interface UpdateAdminUserInput {
  fullName?: string
  username?: string
  email?: string
  role?: ApplicationRole
  authorizationScope?: AuthorizationScope
  active?: boolean
}

export { parseApplicationRole }
