import { createContext, useContext } from "react"

export type ManagerDashboardContextId = "all" | string

interface ManagerRefreshContextValue {
  companyId: ManagerDashboardContextId
  currentTime: Date
  facilityId: ManagerDashboardContextId
  isRefreshing: boolean
  lastUpdated: Date
  refreshVersion: number
  refresh(): Promise<void>
  selectCompany(companyId: ManagerDashboardContextId): void
  selectFacility(facilityId: ManagerDashboardContextId): void
}

const ManagerRefreshContext = createContext<ManagerRefreshContextValue | null>(null)

export const ManagerRefreshProvider = ManagerRefreshContext.Provider

export function useManagerRefresh() {
  const context = useContext(ManagerRefreshContext)

  if (!context) {
    throw new Error("useManagerRefresh must be used within ManagerRefreshProvider.")
  }

  return context
}
