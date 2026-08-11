export interface ManagerNotification {
  id: string
  audience: "MANAGER"
  title: string
  detail: string
  createdAt: string
  isRead: boolean
  visit: {
    id: string
    visitorName: string
    visitorEmail: string
    visitorPhone?: string
    visitTypeName: string
    companyName: string
    facilityName: string
    plannedStart: string
    plannedEnd: string
    note?: string
  }
}
