import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app-shell/AppShell"
import { ManagerShell } from "@/components/app-shell/ManagerShell"

const MyVisitsPage = lazy(() =>
  import("@/features/visits/MyVisitsPage").then((module) => ({ default: module.MyVisitsPage })),
)
const ManagerDashboard = lazy(() =>
  import("@/features/manager/ManagerDashboard").then((module) => ({ default: module.ManagerDashboard })),
)
const AllVisitsPage = lazy(() =>
  import("@/features/manager/AllVisitsPage").then((module) => ({ default: module.AllVisitsPage })),
)

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/my-visits"
          element={
            <Suspense fallback={<RouteSkeleton />}>
              <MyVisitsPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="/manager" element={<ManagerShell />}>
        <Route path="my-visits" element={<Suspense fallback={<RouteSkeleton />}><MyVisitsPage /></Suspense>} />
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<RouteSkeleton />}>
              <ManagerDashboard />
            </Suspense>
          }
        />
        <Route path="all-visits" element={<Suspense fallback={<RouteSkeleton />}><AllVisitsPage /></Suspense>} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/manager/dashboard" replace />} />
    </Routes>
  )
}

function RouteSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Sayfa yükleniyor" role="status">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[520px] rounded-lg border bg-slate-100" />
        <div className="h-[420px] rounded-lg border bg-slate-100" />
      </div>
    </div>
  )
}
