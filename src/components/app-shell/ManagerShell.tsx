import {
  Bell,
  CalendarDays,
  FileBarChart,
  LayoutDashboard,
  Menu,
  PackageCheck,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"

import bplasLogo from "@/assets/bplas-logo.svg"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { ManagerNotification } from "@/domain/manager-notifications"
import { startMinuteClock } from "@/features/manager/manager-clock"
import { ManagerRefreshProvider } from "@/features/manager/manager-refresh-context"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { managerNotificationService } from "@/services/manager-notification-service"

const personalNavigationItems = [{ label: "Ziyaretlerim", icon: CalendarDays, to: "/manager/my-visits" }]
const managementNavigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/manager/dashboard" },
  { label: "Tüm Ziyaretler", icon: CalendarDays, to: "/manager/all-visits" },
  { label: "Mal Girişi / Teslimat", icon: PackageCheck },
  { label: "Raporlar", icon: FileBarChart },
]

export function ManagerShell() {
  const [collapsed, setCollapsed] = useState(() => window.sessionStorage.getItem("manager-navigation-collapsed") === "true")
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const [companyId, setCompanyId] = useState("all")
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [facilityId, setFacilityId] = useState("all")
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const { reload } = useVisits()

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
      <div className={cn("min-h-screen overflow-x-hidden bg-slate-50 transition-[padding-left] duration-200", collapsed ? "md:pl-[60px]" : "md:pl-[188px]")} style={{ zoom: 0.9 }}>
        <ManagerSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
        <ManagerMobileNavigation open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen} />

        <header className="sticky top-0 z-30 flex h-12 items-center border-b bg-white/95 px-3 backdrop-blur md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavigationOpen(true)}
            aria-label="Yönetici menüsünü aç"
            aria-controls="manager-mobile-navigation"
            aria-expanded={mobileNavigationOpen}
          >
            <Menu />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-[1440px] min-w-0 px-4 py-4 md:px-5 lg:px-6"><Outlet /></main>
      </div>
    </ManagerRefreshProvider>
  )
}

function ManagerSidebar({ collapsed, onCollapsedChange }: { collapsed: boolean; onCollapsedChange(value: boolean): void }) {
  return (
    <aside className={cn("fixed inset-y-0 left-0 z-40 hidden overflow-x-hidden border-r border-slate-800 bg-slate-950 text-slate-200 transition-[width] duration-200 md:flex md:flex-col", collapsed ? "w-[60px]" : "w-[188px]")}>
      <div className={cn("flex h-[66px] shrink-0 items-center", collapsed ? "justify-center" : "pl-2.5 pr-4")}>
        <img src={bplasLogo} alt="BPLAS" className="size-10 rounded-lg object-cover shadow-sm" />
        {!collapsed && <p className="ml-3 min-w-0 truncate text-sm font-semibold text-white">Yönetim Sistemi</p>}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-2 py-1.5" aria-label="Yönetici menüsü">
        <NavigationGroup label="Yönetim" collapsed={collapsed} items={managementNavigationItems} />
        <NavigationGroup label="Kişisel" collapsed={collapsed} items={personalNavigationItems} className="mt-5" />
        <button
          type="button"
          className="mt-2 flex-1 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        />
      </nav>

      <div className="shrink-0 border-t border-slate-800 p-2">
        <ManagerNotifications collapsed={collapsed} />
        <ManagerProfile collapsed={collapsed} />
      </div>
    </aside>
  )
}

function ManagerNotifications({ collapsed }: { collapsed: boolean }) {
  const [notifications, setNotifications] = useState(() => managerNotificationService.list())
  const [selectedNotification, setSelectedNotification] = useState<ManagerNotification | null>(null)
  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  useEffect(() => managerNotificationService.subscribe(() => setNotifications(managerNotificationService.list())), [])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            className={cn("relative mb-1.5 text-slate-400 hover:bg-slate-800 hover:text-white", collapsed ? "w-full" : "w-full justify-start")}
            aria-label={`Bildirimler${unreadCount ? `, ${unreadCount} okunmamış` : ""}`}
            title={collapsed ? "Bildirimler" : undefined}
          >
            <Bell />
            {!collapsed && <span>Bildirimler</span>}
            {unreadCount > 0 && <span className="absolute right-1 top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{unreadCount}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-80 p-1.5" aria-label="Yönetici bildirimleri">
          <DropdownMenuLabel className="text-sm text-slate-900">Bildirimler</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <p className="px-2 py-5 text-center text-xs text-slate-500">Yeni bildirim yok.</p>
          ) : notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn("block cursor-pointer whitespace-normal px-2 py-2.5", !notification.isRead && "bg-blue-50/70")}
              onSelect={(event) => {
                event.preventDefault()
                managerNotificationService.markRead(notification.id)
                setSelectedNotification(notification)
              }}
            >
              <p className="text-xs font-semibold text-slate-900">{notification.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{notification.detail}</p>
              <p className="mt-1 text-[11px] text-blue-700">Detayları görüntüle</p>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={Boolean(selectedNotification)} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
            <DialogDescription>{selectedNotification?.detail}</DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
              <dt className="text-slate-500">Ziyaretçi</dt><dd className="font-medium text-slate-900">{selectedNotification.visit.visitorName}</dd>
              <dt className="text-slate-500">İletişim</dt><dd className="break-words text-slate-900">{selectedNotification.visit.visitorEmail}{selectedNotification.visit.visitorPhone && <><br />{selectedNotification.visit.visitorPhone}</>}</dd>
              <dt className="text-slate-500">Ziyaret türü</dt><dd className="text-slate-900">{selectedNotification.visit.visitTypeName}</dd>
              <dt className="text-slate-500">Konum</dt><dd className="text-slate-900">{selectedNotification.visit.companyName} · {selectedNotification.visit.facilityName}</dd>
              <dt className="text-slate-500">Planlanan</dt><dd className="text-slate-900">{formatTr(new Date(selectedNotification.visit.plannedStart), "d MMMM yyyy · HH:mm")}–{formatTr(new Date(selectedNotification.visit.plannedEnd), "HH:mm")}</dd>
              {selectedNotification.visit.note && <><dt className="text-slate-500">Not</dt><dd className="whitespace-pre-wrap text-slate-900">{selectedNotification.visit.note}</dd></>}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ManagerProfile({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn("flex min-w-0 items-center rounded-md", collapsed ? "justify-center py-1.5" : "gap-2.5 px-1.5 py-2")}
      aria-label="Oturum açan kullanıcı: Atahan Bora Bozkurt, Yönetici"
      title={collapsed ? "Atahan Bora Bozkurt · Yönetici" : undefined}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">AB</div>
      {!collapsed && (
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-white">Atahan Bora Bozkurt</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">Yönetici</p>
        </div>
      )}
    </div>
  )
}

function ManagerMobileNavigation({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="manager-mobile-navigation"
        className="left-0 top-0 h-dvh max-h-none w-[min(18rem,calc(100%-3rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 bg-slate-950 p-0 text-slate-200 [&>button]:text-slate-400 [&>button:hover]:text-white"
      >
        <DialogHeader className="border-b border-slate-800 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <img src={bplasLogo} alt="BPLAS" className="size-9 rounded-lg object-cover shadow-sm" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm text-white">Yönetim Sistemi</DialogTitle>
              <DialogDescription className="text-[10px] uppercase tracking-[0.12em] text-slate-400">BPLAS</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Mobil yönetici menüsü">
          <MobileNavigationGroup label="Yönetim" items={managementNavigationItems} onNavigate={() => onOpenChange(false)} />
          <MobileNavigationGroup label="Kişisel" items={personalNavigationItems} onNavigate={() => onOpenChange(false)} className="mt-5" />
        </nav>

        <div className="border-t border-slate-800 p-2">
          <ManagerProfile />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NavigationGroup({ label, collapsed, items, className }: { label: string; collapsed: boolean; items: { label: string; icon: typeof CalendarDays; to?: string }[]; className?: string }) {
  return <div className={className}><p className="h-6 overflow-hidden px-2 pb-2 text-xs font-medium text-slate-400"><span className={cn("whitespace-nowrap", collapsed && "invisible")}>{label}</span></p>{items.map(({ label: itemLabel, icon: Icon, to }) => to ? <NavLink key={itemLabel} to={to} title={collapsed ? itemLabel : undefined} className={({ isActive }) => cn("mb-1 flex h-11 items-center whitespace-nowrap rounded-md text-sm font-medium transition-[padding,gap,colors] duration-200", collapsed ? "justify-center" : "gap-3 pl-3 pr-3", isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white")}><Icon className="size-5 shrink-0" />{!collapsed && <span className="truncate">{itemLabel}</span>}</NavLink> : <div key={itemLabel} className={cn("mb-1 flex h-11 cursor-not-allowed items-center whitespace-nowrap rounded-md text-sm text-slate-600 transition-[padding,gap] duration-200", collapsed ? "justify-center" : "gap-3 pl-3 pr-3")} aria-disabled="true"><Icon className="size-5 shrink-0" />{!collapsed && <span className="truncate">{itemLabel}</span>}</div>)}</div>
}

function MobileNavigationGroup({ label, items, onNavigate, className }: { label: string; items: { label: string; icon: typeof CalendarDays; to?: string }[]; onNavigate(): void; className?: string }) {
  return (
    <div className={className}>
      <p className="px-2 pb-2 text-xs font-medium text-slate-400">{label}</p>
      {items.map(({ label: itemLabel, icon: Icon, to }) => to ? (
        <NavLink key={itemLabel} to={to} onClick={onNavigate} className={({ isActive }) => cn("mb-1 flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium", isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white")}>
          <Icon className="size-5 shrink-0" />
          <span className="truncate">{itemLabel}</span>
        </NavLink>
      ) : (
        <div key={itemLabel} className="mb-1 flex h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm text-slate-600" aria-disabled="true">
          <Icon className="size-5 shrink-0" />
          <span className="truncate">{itemLabel}</span>
        </div>
      ))}
    </div>
  )
}
