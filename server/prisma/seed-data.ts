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
  // A second, separately-scoped employee and manager exercise cross-user / cross-scope
  // authorization: `calisan2` shares the primary company; `yonetici2` is confined to the
  // secondary company and must never see or mutate primary-company data.
  { id: "current-employee-deniz-ozdemir", employeeId: "deniz-ozdemir", username: "calisan2", password: "calisan2", fullName: "Deniz Özdemir", email: "deniz.ozdemir@demo.local", role: "EMPLOYEE" },
  { id: "current-manager-otomotiv", employeeId: "manager-otomotiv", username: "yonetici2", password: "yonetici2", fullName: "Selin Aksoy", email: "selin.aksoy@demo.local", role: "MANAGER" },
]

/**
 * `companyScope` overrides which company/facility a demo user is scoped to. Users omitted here
 * default to the primary company (`bplas` / `bplas-merkez`).
 */
export const demoSeedUserScopes: Readonly<Record<string, { companyId: string; facilityId: string }>> = {
  "current-employee-deniz-ozdemir": { companyId: "bplas", facilityId: "bplas-merkez" },
  "current-manager-otomotiv": { companyId: "bplas-otomotiv", facilityId: "bplas-otomotiv-merkez" },
}

export function shouldSeedDemoData(environment: DemoSeedEnvironment): boolean {
  return environment.NODE_ENV === "development" && environment.DEMO_SEED_ENABLED === "true"
}

export function getDemoSeedUsers(environment: DemoSeedEnvironment): readonly DemoSeedUserDefinition[] {
  return shouldSeedDemoData(environment) ? demoSeedUsers : []
}
