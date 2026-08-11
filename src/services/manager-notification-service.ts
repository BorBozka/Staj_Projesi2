import type { ManagerNotification } from "@/domain/manager-notifications"
import type { Visit } from "@/domain/visits"

type NotificationListener = () => void

class MockManagerNotificationService {
  private notifications: ManagerNotification[] = []
  private listeners = new Set<NotificationListener>()

  list(): ManagerNotification[] {
    return structuredClone(this.notifications)
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  createAdditionalRequirementNotification(visit: Visit): void {
    this.notifications = [
      {
        id: `manager-notification-${crypto.randomUUID()}`,
        audience: "MANAGER",
        title: "İlave gereksinim işaretlenmiş toplantı",
        detail: `${visit.visitor.firstName} ${visit.visitor.lastName} için ilave gereksinim bildirildi.`,
        createdAt: new Date().toISOString(),
        isRead: false,
        visit: {
          id: visit.id,
          visitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
          visitorEmail: visit.visitor.email,
          visitorPhone: visit.visitor.phone,
          visitTypeName: visit.visitTypeName,
          companyName: visit.hostCompanyName,
          facilityName: visit.facilityName,
          plannedStart: visit.plannedStart,
          plannedEnd: visit.plannedEnd,
          note: visit.note,
        },
      },
      ...this.notifications,
    ]
    this.listeners.forEach((listener) => listener())
  }

  markRead(id: string): void {
    this.notifications = this.notifications.map((notification) => notification.id === id ? { ...notification, isRead: true } : notification)
    this.listeners.forEach((listener) => listener())
  }
}

export const managerNotificationService = new MockManagerNotificationService()
