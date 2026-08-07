import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app-shell/AppShell"
import { MyVisitsPage } from "@/features/visits/MyVisitsPage"

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/my-visits" element={<MyVisitsPage />} />
        <Route path="*" element={<Navigate to="/my-visits" replace />} />
      </Route>
    </Routes>
  )
}
