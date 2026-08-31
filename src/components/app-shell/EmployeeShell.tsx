import { Outlet } from "react-router-dom"

import { FocusedShell } from "@/components/app-shell/FocusedShell"

export function EmployeeShell() {
  return (
    <FocusedShell title="Ziyaret Yönetimi" userName="Maya Kara" userInitials="MK" roleLabel="Çalışan">
      <Outlet />
    </FocusedShell>
  )
}
