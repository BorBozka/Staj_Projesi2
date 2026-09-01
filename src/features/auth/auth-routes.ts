import type { ApplicationRole } from "@/domain/admin"

export const roleHomeRoutes: Record<ApplicationRole, string> = {
  EMPLOYEE: "/employee/my-visits",
  MANAGER: "/manager/dashboard",
  ADMIN: "/admin/dashboard",
  SECURITY: "/security/operations",
}

export function getRoleHomeRoute(role: ApplicationRole) {
  return roleHomeRoutes[role]
}
