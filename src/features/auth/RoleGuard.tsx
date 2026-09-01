import { Navigate, Outlet, useLocation } from "react-router-dom"

import { getRoleHomeRoute } from "@/features/auth/auth-routes"
import { useAuth } from "@/features/auth/auth-context"
import type { ApplicationRole } from "@/domain/admin"

export function RoleGuard({ role }: { role: ApplicationRole }) {
  const { authenticated, currentUser, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <AuthLoading />
  if (!authenticated || !currentUser) return <Navigate to="/login" replace state={{ from: location }} />
  if (currentUser.role !== role) return <Navigate to={getRoleHomeRoute(currentUser.role)} replace />
  return <Outlet />
}

export function RoleHomeRedirect() {
  const { currentUser, initializing } = useAuth()
  if (initializing) return <AuthLoading />
  return <Navigate to={currentUser ? getRoleHomeRoute(currentUser.role) : "/login"} replace />
}

function AuthLoading() {
  return <div aria-label="Oturum yükleniyor" className="min-h-dvh bg-slate-50" role="status" />
}
