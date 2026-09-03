import type { EmployeeOption } from "@/domain/visits"
import { foldTr } from "@/lib/turkish"

export interface HostEmployeeFilter {
  /** Selected host company. An employee is eligible only in this company. */
  companyId: string
  /** Selected host facility. An employee is eligible only if scoped to it. */
  facilityId: string
  /** Free-text query typed into the combobox. Blank returns the whole scoped list. */
  query: string
}

/**
 * The employees selectable as the visit's related personnel: those the backend
 * would accept as a host (same company, scoped to the chosen facility — see
 * `validateMeetingInput` in the visitor-operations service), optionally narrowed
 * by a Turkish-aware substring match on the name.
 */
export function filterHostEmployees(
  employees: EmployeeOption[],
  { companyId, facilityId, query }: HostEmployeeFilter,
): EmployeeOption[] {
  const scoped = employees.filter(
    (employee) => employee.companyId === companyId && employee.facilityIds.includes(facilityId),
  )
  const needle = foldTr(query.trim())
  if (!needle) return scoped
  return scoped.filter((employee) => foldTr(employee.name).includes(needle))
}
