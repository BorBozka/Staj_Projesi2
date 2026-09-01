/* eslint-disable react-refresh/only-export-components -- context hook belongs beside its provider. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { DEFAULT_OVERDUE_TOLERANCE_MINUTES, type AdminUser, type OperationalSettings, type OrganizationEntity, type OrganizationKind, type OrganizationSnapshot, type VisitTypeDefinition, type VisitorCardInventoryItem, type VisitorRuleVersion } from "@/domain/admin"
import type { AdminService } from "@/services/admin-service"

interface AdminContextValue {
  users: AdminUser[]
  organization: OrganizationSnapshot | null
  visitTypes: VisitTypeDefinition[]
  visitorCards: VisitorCardInventoryItem[]
  visitorRules: VisitorRuleVersion[]
  settings: OperationalSettings | null
  reload(): Promise<void>
  saveOrganizationEntity(kind: OrganizationKind, entity: Omit<OrganizationEntity, "id"> & { id?: string }): Promise<OrganizationEntity>
  markVisitorCardLost(id: string): Promise<VisitorCardInventoryItem>
  restoreVisitorCard(id: string): Promise<VisitorCardInventoryItem>
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ service, children }: { service: AdminService; children: ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [organization, setOrganization] = useState<OrganizationSnapshot | null>(null)
  const [visitTypes, setVisitTypes] = useState<VisitTypeDefinition[]>([])
  const [visitorCards, setVisitorCards] = useState<VisitorCardInventoryItem[]>([])
  const [visitorRules, setVisitorRules] = useState<VisitorRuleVersion[]>([])
  const [settings, setSettings] = useState<OperationalSettings | null>(null)

  const reload = useCallback(async () => {
    const [nextUsers, nextOrganization, nextVisitTypes, nextCards, nextRules, nextSettings] = await Promise.all([
      service.getUsers(), service.getOrganization(), service.getVisitTypes(), service.getVisitorCards(), service.getVisitorRuleVersions(), service.getOperationalSettings(),
    ])
    setUsers(nextUsers); setOrganization(nextOrganization); setVisitTypes(nextVisitTypes); setVisitorCards(nextCards); setVisitorRules(nextRules); setSettings(nextSettings)
  }, [service])

  useEffect(() => { void reload() }, [reload])
  const saveOrganizationEntity = useCallback(async (kind: OrganizationKind, entity: Omit<OrganizationEntity, "id"> & { id?: string }) => {
    const saved = await service.saveOrganizationEntity(kind, entity)
    setOrganization(await service.getOrganization())
    return saved
  }, [service])
  const markVisitorCardLost = useCallback(async (id: string) => {
    const updated = await service.markVisitorCardLost(id)
    setVisitorCards(await service.getVisitorCards())
    return updated
  }, [service])
  const restoreVisitorCard = useCallback(async (id: string) => {
    const updated = await service.restoreVisitorCard(id)
    setVisitorCards(await service.getVisitorCards())
    return updated
  }, [service])
  const value = useMemo(() => ({ users, organization, visitTypes, visitorCards, visitorRules, settings, reload, saveOrganizationEntity, markVisitorCardLost, restoreVisitorCard }), [users, organization, visitTypes, visitorCards, visitorRules, settings, reload, saveOrganizationEntity, markVisitorCardLost, restoreVisitorCard])
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) throw new Error("useAdmin must be used inside AdminProvider")
  return context
}

/**
 * Narrow view for non-Admin screens (e.g. Manager Dashboard) that only need the
 * operational settings, without exposing the full Admin surface. Falls back to the
 * seeded defaults until the shared AdminProvider finishes its initial load.
 */
export function useOperationalSettings(): OperationalSettings {
  const { settings } = useAdmin()
  return useMemo(
    () => settings ?? { overdueToleranceMinutes: DEFAULT_OVERDUE_TOLERANCE_MINUTES, overdueAlertRepeatMinutes: 10, workdayEndTime: "18:15" },
    [settings],
  )
}
