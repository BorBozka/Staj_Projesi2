export const visitStatuses = ["PLANNED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const

export type VisitStatus = (typeof visitStatuses)[number]

export const invitationStatuses = ["NOT_SENT", "SENDING", "SENT", "FAILED"] as const

export type InvitationStatus = (typeof invitationStatuses)[number]

export interface Visitor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface MeetingDetails {
  creatorEmployeeId: string
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
  note?: string
  hasAdditionalRequirements: boolean
  additionalRequirementNote?: string
}

export interface Meeting extends MeetingDetails {
  id: string
  createdAt: string
  updatedAt: string
}

export interface VisitRecord {
  id: string
  meetingId: string
  visitor: Visitor
  actualCheckIn?: string
  actualCheckOut?: string
  visitorCardReturned?: boolean
  status: VisitStatus
  invitationStatus: InvitationStatus
  invitationSentAt?: string
  invitationError?: string
  createdAt: string
  updatedAt: string
  cancelledAt?: string
}

// Read model used by existing visitor-based screens. Shared fields are projected from
// Meeting by the service and are never stored as editable VisitRecord state.
export interface Visit extends VisitRecord, MeetingDetails {}

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

export interface VisitorInput {
  visitId?: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface MeetingInput {
  visitors: VisitorInput[]
  visitTypeId: string
  hostEmployeeName: string
  hostCompanyId: string
  facilityId: string
  plannedStart: string
  plannedEnd: string
  note?: string
  hasAdditionalRequirements?: boolean
  additionalRequirementNote?: string
}

export interface MeetingWithVisits {
  meeting: Meeting
  visits: Visit[]
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
