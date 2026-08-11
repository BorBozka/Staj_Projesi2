import { MockVisitService } from "@/services/mock-visit-service"
export { managerDashboardService } from "@/services/manager-dashboard-service"
export { managerNotificationService } from "@/services/manager-notification-service"
import type { VisitService } from "@/services/visit-service"

export const visitService: VisitService = new MockVisitService()

export type { VisitService }
