import type { ApplicationRole } from "../src/auth/auth-types.js"

export interface DemoSeedEnvironment {
  NODE_ENV?: string
  DEMO_SEED_ENABLED?: string
}

export interface DemoSeedUserDefinition {
  id: string
  employeeId?: string
  username: string
  password: string
  fullName: string
  email: string
  role: ApplicationRole
}

/** Demo credentials are deliberately development-only and are never loaded in production. */
export const demoSeedUsers: readonly DemoSeedUserDefinition[] = [
  { id: "current-employee-maya-kara", employeeId: "maya-kara", username: "calisan", password: "calisan", fullName: "Maya Kara", email: "maya.kara@demo.local", role: "EMPLOYEE" },
  { id: "current-manager-atahan-bozkurt", employeeId: "atahan-bozkurt", username: "yonetici", password: "yonetici", fullName: "Atahan Bozkurt", email: "atahan.bozkurt.manager@demo.local", role: "MANAGER" },
  { id: "current-admin-atahan-bozkurt", username: "admin", password: "admin", fullName: "Atahan Bozkurt", email: "atahan.bozkurt.admin@demo.local", role: "ADMIN" },
  { id: "current-security-atahan-bozkurt", employeeId: "security-atahan-bozkurt", username: "guvenlik", password: "guvenlik", fullName: "Atahan Bozkurt", email: "atahan.bozkurt.security@demo.local", role: "SECURITY" },
]

export function shouldSeedDemoData(environment: DemoSeedEnvironment): boolean {
  return environment.NODE_ENV === "development" && environment.DEMO_SEED_ENABLED === "true"
}

export function getDemoSeedUsers(environment: DemoSeedEnvironment): readonly DemoSeedUserDefinition[] {
  return shouldSeedDemoData(environment) ? demoSeedUsers : []
}
