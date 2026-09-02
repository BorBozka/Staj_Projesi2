import { Navigate, Outlet, useLocation } from "react-router-dom"

import { getRoleHomeRoute } from "@/features/auth/auth-routes"
import { useAuth } from "@/features/auth/auth-context"
import type { ApplicationRole } from "@/domain/admin"

export function RoleGuard({ role }: { role: ApplicationRole }) {
  const { authenticated, currentUser, initializing, initError, retryHydration } = useAuth()
  const location = useLocation()

  if (initError) return <SessionUnavailable message={initError} onRetry={retryHydration} />
  if (initializing) return <AuthLoading />
  if (!authenticated || !currentUser) return <Navigate to="/login" replace state={{ from: location }} />
  if (currentUser.role !== role) return <Navigate to={getRoleHomeRoute(currentUser.role)} replace />
  return <Outlet />
}

export function RoleHomeRedirect() {
  const { currentUser, initializing, initError, retryHydration } = useAuth()
  if (initError) return <SessionUnavailable message={initError} onRetry={retryHydration} />
  if (initializing) return <AuthLoading />
  return <Navigate to={currentUser ? getRoleHomeRoute(currentUser.role) : "/login"} replace />
}

function AuthLoading() {
  return <div aria-label="Oturum yükleniyor" className="min-h-dvh bg-slate-50" role="status" />
}

function SessionUnavailable({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <div role="alert" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-sm font-semibold text-slate-900">Sunucuya ulaşılamadı</h1>
        <p className="mt-2 text-xs text-slate-500">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-xs font-medium text-white transition-colors hover:bg-slate-700"
        >
          Yeniden dene
        </button>
      </div>
    </main>
  )
}
