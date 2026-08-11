export const visitStatuses = ["PLANNED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const

export type VisitStatus = (typeof visitStatuses)[number]

export interface Visitor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface Visit {
  id: string
  creatorEmployeeId?: string
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
  actualCheckIn?: string
  actualCheckOut?: string
  visitorCardReturned?: boolean
  status: VisitStatus
  note?: string
  hasAdditionalRequirements?: boolean
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
    role: "EMPLOYEE" | "MANAGER"
  }
}

export interface VisitInput {
  visitorFirstName: string
  visitorLastName: string
  visitorEmail: string
  visitorPhone?: string
  visitTypeId: string
  hostEmployeeName: string
  hostCompanyId: string
  facilityId: string
  plannedStart: string
  plannedEnd: string
  note?: string
  hasAdditionalRequirements?: boolean
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
