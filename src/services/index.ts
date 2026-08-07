import { MockVisitService } from "@/services/mock-visit-service"
import type { VisitService } from "@/services/visit-service"

export const visitService: VisitService = new MockVisitService()

export type { VisitService }
