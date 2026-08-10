import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app-shell/AppShell"

const MyVisitsPage = lazy(() =>
  import("@/features/visits/MyVisitsPage").then((module) => ({ default: module.MyVisitsPage })),
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
        <Route path="*" element={<Navigate to="/my-visits" replace />} />
      </Route>
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
