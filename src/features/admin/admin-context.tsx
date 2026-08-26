/* eslint-disable react-refresh/only-export-components -- context hook belongs beside its provider. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import type { AdminUser, OperationalSettings, OrganizationSnapshot, VisitTypeDefinition, VisitorCardInventoryItem, VisitorRuleVersion } from "@/domain/admin"
import type { AdminService } from "@/services/admin-service"

interface AdminContextValue {
  users: AdminUser[]
  organization: OrganizationSnapshot | null
  visitTypes: VisitTypeDefinition[]
  visitorCards: VisitorCardInventoryItem[]
  visitorRules: VisitorRuleVersion[]
  settings: OperationalSettings | null
  reload(): Promise<void>
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
  const value = useMemo(() => ({ users, organization, visitTypes, visitorCards, visitorRules, settings, reload }), [users, organization, visitTypes, visitorCards, visitorRules, settings, reload])
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) throw new Error("useAdmin must be used inside AdminProvider")
  return context
}
