import { NavLink, Outlet, useLocation } from "react-router-dom"

import { FocusedShell } from "@/components/app-shell/FocusedShell"
import { cn } from "@/lib/utils"

const securityNavigationItems = [
  { label: "Operasyon", to: "/security/operations" },
  { label: "Mal Hareketleri", to: "/security/goods-movements" },
] as const

export function SecurityShell() {
  return (
    <FocusedShell title="Güvenlik" userName="Atahan Bozkurt" userInitials="AB" roleLabel="Güvenlik" navigation={<SecurityNavigation />}>
      <Outlet />
    </FocusedShell>
  )
}

function SecurityNavigation() {
  const { pathname } = useLocation()

  return (
    <nav className="flex items-center gap-1" aria-label="Güvenlik menüsü">
      {securityNavigationItems.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          aria-current={pathname === to ? "page" : undefined}
          className={({ isActive }) =>
            cn(
              "border-b-2 px-3 py-1.5 text-xs transition-colors",
              isActive
                ? "border-blue-600 font-semibold text-blue-700"
                : "border-transparent font-medium text-slate-600 hover:text-slate-900",
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
