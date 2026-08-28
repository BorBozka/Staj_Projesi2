import { Menu, PackageCheck, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"

import bplasLogo from "@/assets/bplas-logo.svg"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const securityNavigationItems = [
  { label: "Operasyon", icon: ShieldCheck, to: "/security/operations" },
  { label: "Mal Hareketleri", icon: PackageCheck, to: "/security/goods-movements" },
] as const

const securityNavigationStorageKey = "security-navigation-collapsed"

export function SecurityShell() {
  const [collapsed, setCollapsed] = useState(() => window.sessionStorage.getItem(securityNavigationStorageKey) === "true")
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const { pathname } = useLocation()
  const activeLabel = securityNavigationItems.find((item) => item.to === pathname)?.label ?? "Güvenlik"

  useEffect(() => {
    window.sessionStorage.setItem(securityNavigationStorageKey, String(collapsed))
  }, [collapsed])

  return (
    <div className={cn("h-dvh overflow-hidden bg-slate-50 transition-[padding-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none", collapsed ? "md:pl-[60px]" : "md:pl-[188px]")}>
      <SecuritySidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <SecurityMobileNavigation open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen} />

      <header className="flex h-12 items-center gap-2 border-b bg-white/95 px-3 backdrop-blur md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileNavigationOpen(true)}
          aria-label="Güvenlik menüsünü aç"
          aria-controls="security-mobile-navigation"
          aria-expanded={mobileNavigationOpen}
        >
          <Menu />
        </Button>
        <span className="text-sm font-semibold text-slate-900">{activeLabel}</span>
      </header>

      <main className="h-[calc(100dvh-3rem)] min-h-0 overflow-hidden px-3 py-3 md:h-dvh md:px-5 md:py-4 lg:px-6">
        <div className="mx-auto h-full min-h-0 w-full max-w-[1600px]"><Outlet /></div>
      </main>
    </div>
  )
}

function SecuritySidebar({ collapsed, onCollapsedChange }: { collapsed: boolean; onCollapsedChange(value: boolean): void }) {
  const { pathname } = useLocation()
  const labelTransition = cn("min-w-0 shrink-0 truncate transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none", collapsed ? "translate-x-1 opacity-0" : "translate-x-0 opacity-100 delay-100")

  return (
    <aside className={cn("fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-slate-800 bg-slate-950 text-slate-200 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none md:flex md:flex-col", collapsed ? "w-[60px]" : "w-[188px]")}>
      <button
        type="button"
        className={cn("flex h-[66px] w-full shrink-0 items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500", collapsed ? "justify-center px-1" : "gap-3 px-2.5")}
        onClick={() => onCollapsedChange(!collapsed)}
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
      >
        <img src={bplasLogo} alt="BPLAS" className="size-10 rounded-lg object-cover shadow-sm" />
        <span aria-hidden={collapsed} className={cn("text-sm font-semibold text-white", labelTransition)}>Güvenlik</span>
      </button>

      <nav className="min-h-0 flex-1 overflow-hidden px-2 pb-1 pt-2" aria-label="Güvenlik menüsü">
        {securityNavigationItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            aria-current={pathname === to ? "page" : undefined}
            className={({ isActive }) => cn("mb-0.5 flex h-9 items-center gap-3 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors", isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white")}
          >
            <Icon className="size-5 shrink-0" />
            <span aria-hidden={collapsed} className={labelTransition}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-800 p-1.5">
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-2.5 rounded-md px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={`Oturum açan kullanıcı: Atahan Bozkurt, Güvenlik. Menüyü ${collapsed ? "genişlet" : "daralt"}`}
          title={collapsed ? "Atahan Bozkurt · Güvenlik" : undefined}
        >
          <SecurityProfile collapsed={collapsed} />
        </button>
      </div>
    </aside>
  )
}

function SecurityProfile({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">AB</div>
      <div aria-hidden={collapsed} className={cn("min-w-0 shrink-0 leading-tight transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none", collapsed ? "translate-x-1 opacity-0" : "translate-x-0 opacity-100 delay-100")}>
        <p className="truncate text-sm font-semibold text-white">Atahan Bozkurt</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">Güvenlik</p>
      </div>
    </>
  )
}

function SecurityMobileNavigation({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="security-mobile-navigation"
        className="left-0 top-0 h-dvh max-h-none w-[min(18rem,calc(100%-3rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 bg-slate-950 p-0 text-slate-200 [&>button]:text-slate-400 [&>button:hover]:text-white"
      >
        <DialogHeader className="border-b border-slate-800 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <img src={bplasLogo} alt="BPLAS" className="size-9 rounded-lg object-cover shadow-sm" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm text-white">Güvenlik</DialogTitle>
              <DialogDescription className="text-[10px] uppercase tracking-[0.12em] text-slate-400">BPLAS</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <nav className="min-h-0 flex-1 px-2 py-3" aria-label="Mobil güvenlik menüsü">
          {securityNavigationItems.map(({ label, icon: Icon, to }) => (
            <NavLink key={to} to={to} onClick={() => onOpenChange(false)} className={({ isActive }) => cn("mb-1 flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium", isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white")}>
              <Icon className="size-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-slate-800 p-3">
          <SecurityProfile />
        </div>
      </DialogContent>
    </Dialog>
  )
}
