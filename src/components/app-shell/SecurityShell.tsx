import { NavLink, Outlet, useLocation } from "react-router-dom"

import { FocusedShell } from "@/components/app-shell/FocusedShell"
import { HeaderClock } from "@/components/app-shell/HeaderClock"
import { toAccountProfile } from "@/features/account/account-profile"
import { useAuth } from "@/features/auth/auth-context"
import { cn } from "@/lib/utils"

const securityNavigationItems = [
  { label: "Operasyon", to: "/security/operations" },
  { label: "Mal Hareketleri", to: "/security/goods-movements" },
] as const

export function SecurityShell() {
  const { currentUser } = useAuth()
  if (!currentUser) return null
  return (
    <FocusedShell
      title="Güvenlik"
      account={toAccountProfile(currentUser)}
      headerHeight={64}
      headerNavigation={<SecurityNavigation />}
      headerCenter={<HeaderClock />}
    >
      <Outlet />
    </FocusedShell>
  )
}

function SecurityNavigation() {
  const { pathname } = useLocation()

  return (
    <nav className="flex shrink-0 items-center rounded-md bg-slate-100/80 p-0.5" aria-label="Güvenlik menüsü">
      {securityNavigationItems.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          aria-current={pathname === to ? "page" : undefined}
          className={({ isActive }) => cn(
            "rounded px-2 py-1 text-xs transition-colors",
            isActive ? "bg-white font-semibold text-blue-700 shadow-sm" : "font-medium text-slate-600 hover:text-slate-900",
          )}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
