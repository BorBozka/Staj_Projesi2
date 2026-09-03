import { Outlet } from "react-router-dom"

import { FocusedShell } from "@/components/app-shell/FocusedShell"
import { toAccountProfile } from "@/features/account/account-profile"
import { useAuth } from "@/features/auth/auth-context"

export function EmployeeShell() {
  const { currentUser } = useAuth()
  if (!currentUser) return null
  return (
    <FocusedShell title="Ziyaret Yönetimi" account={toAccountProfile(currentUser)} contentClassName="lg:pr-3">
      <Outlet />
    </FocusedShell>
  )
}
