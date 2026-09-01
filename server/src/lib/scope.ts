export interface AuthorizationScope {
  companyIds: string[]
  facilityIds: string[]
  securityGateIds: string[]
}

export function isWithinAuthorizationScope(
  scope: AuthorizationScope,
  target: { companyId: string; facilityId?: string; securityGateId?: string },
): boolean {
  if (!scope.companyIds.includes(target.companyId)) return false
  if (scope.facilityIds.length > 0 && target.facilityId && !scope.facilityIds.includes(target.facilityId)) return false
  if (scope.securityGateIds.length > 0 && target.securityGateId && !scope.securityGateIds.includes(target.securityGateId)) return false
  return true
}
