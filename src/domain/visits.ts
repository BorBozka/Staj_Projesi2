export const visitStatuses = ["PLANNED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const

export type VisitStatus = (typeof visitStatuses)[number]

export interface Visitor {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface Visit {
  id: string
  visitor: Visitor
  visitTypeId: string
  visitTypeName: string
  hostEmployeeId: string
  hostEmployeeName: string
  hostCompanyId: string
  hostCompanyName: string
  facilityId: string
  facilityName: string
  plannedStart: string
  plannedEnd: string
  status: VisitStatus
  note?: string
  createdAt: string
  updatedAt: string
  cancelledAt?: string
}

export interface CompanyOption {
  id: string
  name: string
}

export interface FacilityOption {
  id: string
  companyId: string
  name: string
}

export interface EmployeeOption {
  id: string
  companyId: string
  facilityIds: string[]
  name: string
  department: string
}

export interface VisitTypeOption {
  id: string
  name: string
}

export interface VisitReferenceData {
  companies: CompanyOption[]
  facilities: FacilityOption[]
  employees: EmployeeOption[]
  visitTypes: VisitTypeOption[]
  currentEmployee: {
    employeeId: string
    companyId: string
    facilityId: string
  }
}

export interface VisitInput {
  visitorFirstName: string
  visitorLastName: string
  visitorEmail: string
  visitTypeId: string
  hostEmployeeId: string
  hostCompanyId: string
  facilityId: string
  plannedStart: string
  plannedEnd: string
  note?: string
}

export interface RescheduleVisitInput {
  plannedStart: string
  plannedEnd: string
}

export const visitStatusLabels: Record<VisitStatus, string> = {
  PLANNED: "Planlandı",
  CHECKED_IN: "İçeride",
  CHECKED_OUT: "Çıkış Yapıldı",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelmedi",
}
