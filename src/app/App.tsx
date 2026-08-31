import { lazy, Suspense, useEffect } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { EmployeeShell } from "@/components/app-shell/EmployeeShell"
import { ManagerShell } from "@/components/app-shell/ManagerShell"
import { SecurityShell } from "@/components/app-shell/SecurityShell"

const MyVisitsPage = lazy(() =>
  import("@/features/visits/MyVisitsPage").then((module) => ({ default: module.MyVisitsPage })),
)
const ManagerDashboard = lazy(() =>
  import("@/features/manager/ManagerDashboard").then((module) => ({ default: module.ManagerDashboard })),
)
const AllVisitsPage = lazy(() =>
  import("@/features/manager/AllVisitsPage").then((module) => ({ default: module.AllVisitsPage })),
)
const ResourceCatalogPage = lazy(() =>
  import("@/features/resources/ResourceCatalogPage").then((module) => ({ default: module.ResourceCatalogPage })),
)
const TransportPlanningPage = lazy(() =>
  import("@/features/transport/TransportPlanningPage").then((module) => ({ default: module.TransportPlanningPage })),
)
const GoodsMovementsPage = lazy(() =>
  import("@/features/goods/GoodsMovementsPage").then((module) => ({ default: module.GoodsMovementsPage })),
)
const ReportsPage = lazy(() =>
  import("@/features/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })),
)
const AdminUsersPage = lazy(() =>
  import("@/features/admin/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage })),
)
const OrganizationPage = lazy(() =>
  import("@/features/admin/OrganizationPage").then((module) => ({ default: module.OrganizationPage })),
)
const SystemSettingsPage = lazy(() =>
  import("@/features/admin/SystemSettingsPage").then((module) => ({ default: module.SystemSettingsPage })),
)
const SecurityOperationsPage = lazy(() =>
  import("@/features/security/SecurityOperationsPage").then((module) => ({ default: module.SecurityOperationsPage })),
)
const SecurityGoodsMovementsPage = lazy(() =>
  import("@/features/security/SecurityGoodsMovementsPage").then((module) => ({ default: module.SecurityGoodsMovementsPage })),
)

export function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    const pageTitles: Record<string, string> = {
      "/manager/transport-planning": "BPLAS - Araç ve Şoför Planı",
      "/manager/dashboard": "BPLAS — Dashboard",
      "/manager/all-visits": "BPLAS — Tüm Ziyaretler",
      "/manager/resources": "BPLAS — Kaynaklar",
      "/manager/goods-movements": "BPLAS — Mal Giriş / Çıkış",
      "/manager/reports": "BPLAS — Raporlar",
      "/manager/my-visits": "BPLAS — Ziyaretlerim",
      "/admin/dashboard": "BPLAS — Admin Dashboard",
      "/admin/all-visits": "BPLAS — Tüm Ziyaretler",
      "/admin/users": "BPLAS — Kullanıcılar",
      "/admin/organization": "BPLAS — Organizasyon",
      "/admin/system-settings": "BPLAS — Sistem Ayarları",
      "/security/operations": "BPLAS — Güvenlik Operasyonu",
      "/security/goods-movements": "BPLAS — Güvenlik Mal Hareketleri",
      "/my-visits": "BPLAS — Ziyaretlerim",
    }
    document.title = pageTitles[pathname] ?? "BPLAS — Ziyaret Yönetimi"
  }, [pathname])

  return (
    <Routes>
      <Route element={<EmployeeShell />}>
        <Route
          path="/my-visits"
          element={
            <Suspense fallback={<RouteSkeleton />}>
              <MyVisitsPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="/manager/*" element={<ManagerRouteRedirect />} />
      <Route path="/security" element={<SecurityShell />}>
        <Route index element={<Navigate to="operations" replace />} />
        <Route path="operations" element={<Suspense fallback={<RouteSkeleton />}><SecurityOperationsPage /></Suspense>} />
        <Route path="goods-movements" element={<Suspense fallback={<RouteSkeleton />}><SecurityGoodsMovementsPage /></Suspense>} />
      </Route>
      <Route path="/admin" element={<ManagerShell role="ADMIN" />}>
        <Route path="my-visits" element={<Suspense fallback={<RouteSkeleton />}><MyVisitsPage /></Suspense>} />
        <Route path="dashboard" element={<Suspense fallback={<RouteSkeleton />}><ManagerDashboard /></Suspense>} />
        <Route path="all-visits" element={<Suspense fallback={<RouteSkeleton />}><AllVisitsPage /></Suspense>} />
        <Route path="resources" element={<Suspense fallback={<RouteSkeleton />}><ResourceCatalogPage /></Suspense>} />
        <Route path="transport-planning" element={<Suspense fallback={<RouteSkeleton />}><TransportPlanningPage /></Suspense>} />
        <Route path="goods-movements" element={<Suspense fallback={<RouteSkeleton />}><GoodsMovementsPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<RouteSkeleton />}><ReportsPage /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<RouteSkeleton />}><AdminUsersPage /></Suspense>} />
        <Route path="organization" element={<Suspense fallback={<RouteSkeleton />}><OrganizationPage /></Suspense>} />
        <Route path="system-settings" element={<Suspense fallback={<RouteSkeleton />}><SystemSettingsPage /></Suspense>} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  )
}

function ManagerRouteRedirect() {
  const location = useLocation()
  const pathname = location.pathname.replace(/^\/manager(?=\/|$)/, "/admin")
  return <Navigate to={{ pathname, search: location.search, hash: location.hash }} replace />
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
