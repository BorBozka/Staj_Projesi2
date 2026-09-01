import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"

import { FocusedShell } from "@/components/app-shell/FocusedShell"
import { currentAccountProfiles } from "@/features/account/account-profile"
import { cn } from "@/lib/utils"

const securityNavigationItems = [
  { label: "Operasyon", to: "/security/operations" },
  { label: "Mal Hareketleri", to: "/security/goods-movements" },
] as const

export function SecurityShell() {
  return (
    <FocusedShell
      title="Güvenlik"
      account={currentAccountProfiles.security}
      headerHeight={64}
      headerNavigation={<SecurityNavigation />}
      headerCenter={<SecurityClock />}
    >
      <Outlet />
    </FocusedShell>
  )
}

function SecurityClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="shrink-0 text-center leading-none">
      <time className="block tabular-nums text-[38px] font-semibold tracking-tight text-slate-900" dateTime={now.toISOString()}>{formatClockTime(now)}</time>
      <p className="mt-0.5 text-[11px] text-slate-500">{formatClockDate(now)}</p>
    </div>
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

function formatClockTime(value: Date) {
  return value.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
}

function formatClockDate(value: Date) {
  return value.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })
}
