import { CalendarDays, ChevronDown, FileBarChart, LayoutDashboard, PackageCheck, RefreshCw } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import bplasLogo from "@/assets/bplas-logo.svg"
import { startMinuteClock } from "@/features/manager/manager-clock"
import { ManagerDashboardFilters } from "@/features/manager/ManagerDashboardFilters"
import { ManagerRefreshProvider } from "@/features/manager/manager-refresh-context"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"

const personalNavigationItems = [{ label: "Ziyaretlerim", icon: CalendarDays, to: "/manager/my-visits" }]
const managementNavigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/manager/dashboard" },
  { label: "Tüm Ziyaretler", icon: CalendarDays, to: "/manager/all-visits" },
  { label: "Mal Girişi / Teslimatlar", icon: PackageCheck },
  { label: "Raporlar", icon: FileBarChart },
]

export function ManagerShell() {
  const [collapsed, setCollapsed] = useState(() => window.sessionStorage.getItem("manager-navigation-collapsed") === "true")
  const [companyId, setCompanyId] = useState("all")
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [facilityId, setFacilityId] = useState("all")
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const { reload } = useVisits()
  const location = useLocation()
  const isDashboard = location.pathname.endsWith("/dashboard")
  const pageTitle = location.pathname.endsWith("/my-visits") ? "Ziyaretlerim" : location.pathname.endsWith("/all-visits") ? "Tüm Ziyaretler" : "Yönetici Dashboard"

  useEffect(() => {
    window.sessionStorage.setItem("manager-navigation-collapsed", String(collapsed))
  }, [collapsed])

  useEffect(() => startMinuteClock(setCurrentTime), [])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await reload()
      setLastUpdated(new Date())
      setRefreshVersion((value) => value + 1)
    } finally {
      setIsRefreshing(false)
    }
  }, [reload])

  const selectCompany = useCallback((nextCompanyId: string) => {
    setCompanyId(nextCompanyId)
    setFacilityId("all")
  }, [])

  return (
    <ManagerRefreshProvider value={{ companyId, currentTime, facilityId, isRefreshing, lastUpdated, refreshVersion, refresh, selectCompany, selectFacility: setFacilityId }}>
      <div className={cn("min-h-screen bg-slate-50", collapsed ? "md:pl-[60px]" : "md:pl-[188px]")} style={{ zoom: 0.9 }}>
        <aside
          className={cn("fixed inset-y-0 left-0 z-40 hidden cursor-pointer border-r border-slate-800 bg-slate-950 text-slate-200 transition-[width] duration-200 md:flex md:flex-col", collapsed ? "w-[60px]" : "w-[188px]")}
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a,button")) return
            setCollapsed((value) => !value)
          }}
        >
          <div className={cn("flex h-[66px] items-center", collapsed ? "justify-center" : "px-4")}>
            <img src={bplasLogo} alt="BPLAS" className="size-10 rounded-lg object-cover shadow-sm" />
            {!collapsed && <p className="ml-3 text-sm font-semibold text-white">Yönetim Sistemi</p>}
          </div>
          <nav className="flex-1 px-2 py-1.5" aria-label="Yönetici menüsü">
            <NavigationGroup label="Yönetim" collapsed={collapsed} items={managementNavigationItems} />
            <NavigationGroup label="Kişisel" collapsed={collapsed} items={personalNavigationItems} className="mt-5" />
          </nav>
        </aside>

        <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between gap-5 border-b bg-white/95 px-5 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <h1 className="min-w-0 text-xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
            {isDashboard && <ManagerDashboardFilters placement="header" className="hidden xl:flex" />}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600" onClick={() => void refresh()} disabled={isRefreshing} aria-label="Dashboard verilerini yenile">
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
              <span>Son güncelleme {formatTr(lastUpdated, "HH:mm")}</span>
            </Button>
            <div className="h-7 border-l" />
            <div className="flex items-center gap-2.5"><div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">AB</div><div className="hidden leading-tight sm:block"><p className="text-sm font-semibold text-slate-900">Atahan Bora Bozkurt</p><p className="mt-0.5 text-xs text-slate-500">Yönetici</p></div><ChevronDown className="size-4 text-slate-500" /></div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-5 lg:px-6"><Outlet /></main>
      </div>
    </ManagerRefreshProvider>
  )
}

function NavigationGroup({ label, collapsed, items, className }: { label: string; collapsed: boolean; items: { label: string; icon: typeof CalendarDays; to?: string }[]; className?: string }) {
  return <div className={className}>{!collapsed && <p className="px-2 pb-2 text-xs font-medium text-slate-400">{label}</p>}{items.map(({ label: itemLabel, icon: Icon, to }) => to ? <NavLink key={itemLabel} to={to} title={collapsed ? itemLabel : undefined} className={({ isActive }) => cn("mb-1 flex h-11 items-center rounded-md text-sm font-medium transition-colors", collapsed ? "justify-center" : "gap-3 px-3", isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white")}><Icon className="size-5 shrink-0" />{!collapsed && itemLabel}</NavLink> : <div key={itemLabel} className={cn("mb-1 flex h-11 cursor-not-allowed items-center rounded-md text-sm text-slate-600", collapsed ? "justify-center" : "gap-3 px-3")} aria-disabled="true"><Icon className="size-5 shrink-0" />{!collapsed && itemLabel}</div>)}</div>
}
