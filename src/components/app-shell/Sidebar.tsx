import { CalendarDays, ChevronsLeft, ChevronsRight, ShieldCheck } from "lucide-react"
import { NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange(value: boolean): void
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden border-r bg-slate-950 text-slate-200 transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-[60px]" : "w-52",
      )}
    >
      <div className={cn("flex h-[50px] items-center border-b border-slate-800", collapsed ? "justify-center" : "px-3.5")}>
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm">
          <ShieldCheck className="size-[18px]" />
        </div>
        {!collapsed && (
          <div className="ml-2.5 min-w-0">
            <p className="truncate text-sm font-semibold text-white">BPLAS</p>
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-slate-400">Ziyaret Yönetimi</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-1.5 py-2.5" aria-label="Çalışan menüsü">
        {!collapsed && <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Çalışan</p>}
        <NavLink
          to="/my-visits"
          className={({ isActive }) =>
            cn(
              "flex h-8 items-center rounded-md text-sm transition-colors",
              collapsed ? "justify-center px-0" : "gap-3 px-2.5",
              isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
            )
          }
          title={collapsed ? "Ziyaretlerim" : undefined}
        >
          <CalendarDays className="size-4 shrink-0" />
          {!collapsed && <span>Ziyaretlerim</span>}
        </NavLink>
      </nav>

      <div className="border-t border-slate-800 p-1.5">
        <Button
          variant="ghost"
          size={collapsed ? "icon-sm" : "sm"}
          className={cn("text-slate-400 hover:bg-slate-800 hover:text-white", !collapsed && "w-full justify-start")}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        >
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          {!collapsed && <span>Daralt</span>}
        </Button>
      </div>
    </aside>
  )
}
