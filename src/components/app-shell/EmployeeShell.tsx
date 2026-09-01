import { Outlet } from "react-router-dom"

import { FocusedShell } from "@/components/app-shell/FocusedShell"
import { currentAccountProfiles } from "@/features/account/account-profile"

export function EmployeeShell() {
  return (
    <FocusedShell title="Ziyaret Yönetimi" account={currentAccountProfiles.employee}>
      <Outlet />
    </FocusedShell>
  )
}
