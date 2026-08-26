import type { AdminUser, OperationalSettings, OrganizationEntity, OrganizationKind, OrganizationSnapshot, VisitTypeDefinition, VisitorCardInventoryItem, VisitorCardStatus, VisitorRuleVersion } from "@/domain/admin"

export interface SaveAdminUserOptions {
  // The id of the currently signed-in Admin performing this save, used to enforce the
  // self-deactivation/self-demotion guards. A real backend would derive this from the
  // authenticated session instead of a caller-supplied value.
  actingUserId?: string
}

export interface AdminService {
  getUsers(): Promise<AdminUser[]>
  saveUser(user: Omit<AdminUser, "id"> & { id?: string }, options?: SaveAdminUserOptions): Promise<AdminUser>
  // Never returns or stores the password — a real backend would forward it to an
  // auth/hash service instead. Rejects for Active Directory-owned users.
  resetLocalUserPassword(userId: string, newPassword: string): Promise<void>
  getOrganization(): Promise<OrganizationSnapshot>
  saveOrganizationEntity(kind: OrganizationKind, entity: Omit<OrganizationEntity, "id"> & { id?: string }): Promise<OrganizationEntity>
  getVisitTypes(): Promise<VisitTypeDefinition[]>
  saveVisitType(visitType: Omit<VisitTypeDefinition, "id"> & { id?: string }): Promise<VisitTypeDefinition>
  getVisitorCards(): Promise<VisitorCardInventoryItem[]>
  saveVisitorCard(card: Omit<VisitorCardInventoryItem, "id"> & { id?: string }): Promise<VisitorCardInventoryItem>
  changeVisitorCardStatus(id: string, status: VisitorCardStatus): Promise<VisitorCardInventoryItem>
  getVisitorRuleVersions(): Promise<VisitorRuleVersion[]>
  publishVisitorRule(content: string): Promise<VisitorRuleVersion>
  getOperationalSettings(): Promise<OperationalSettings>
  saveOperationalSettings(settings: OperationalSettings): Promise<OperationalSettings>
}
