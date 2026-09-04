import { Outlet } from "react-router-dom"

import { FocusedShell } from "@/components/app-shell/FocusedShell"
import { HeaderClock } from "@/components/app-shell/HeaderClock"
import { toAccountProfile } from "@/features/account/account-profile"
import { useAuth } from "@/features/auth/auth-context"

export function EmployeeShell() {
  const { currentUser } = useAuth()
  if (!currentUser) return null
  return (
    <FocusedShell
      title="Ziyaretlerim"
      account={toAccountProfile(currentUser)}
      headerHeight={64}
      headerCenter={<div className="hidden md:block"><HeaderClock /></div>}
      contentClassName="lg:pr-3"
    >
      <Outlet />
    </FocusedShell>
  )
}
