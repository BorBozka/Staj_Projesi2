export function shouldShowDifferentFacility(facilityId: string, currentFacilityId?: string) {
  return Boolean(currentFacilityId && facilityId !== currentFacilityId)
}
