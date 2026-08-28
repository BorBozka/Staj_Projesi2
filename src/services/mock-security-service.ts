import type { VisitorCardInventoryItem } from "@/domain/admin"
import { isValidVisitorEmail, normalizeVehiclePlate, normalizeVisitorEmail, type Visit } from "@/domain/visits"
import type { MockVisitService } from "@/services/mock-visit-service"
import type { MockVisitorCardStore } from "@/services/mock-visitor-card-store"
import type { SecurityCheckInInput, SecurityService, SecurityVisitorCorrectionInput } from "@/services/security-service"

export class MockSecurityService implements SecurityService {
  constructor(
    private readonly cardStore: MockVisitorCardStore,
    private readonly visitService: MockVisitService,
  ) {}

  async getAvailableVisitorCards(): Promise<VisitorCardInventoryItem[]> {
    return this.cardStore.list().filter((card) => card.status === "AVAILABLE")
  }

  async checkInVisit(input: SecurityCheckInInput): Promise<Visit> {
    const card = this.cardStore.get(input.visitorCardId)
    if (!card) throw new Error("Ziyaretçi kartı bulunamadı.")
    if (card.status !== "AVAILABLE") throw new Error("Seçilen kart şu anda kullanılabilir değil.")

    const current = this.visitService.getVisitRecordForSecurity(input.visitId)
    if (current.status !== "PLANNED") throw new Error("Yalnızca planlanmış ziyaretler giriş yapabilir.")

    // Validation is complete; the two mutations below run synchronously with no intervening
    // await so the visit and card update as a single atomic step.
    const vehiclePlate = normalizeVehiclePlate(input.vehiclePlate)
    const updatedVisit = this.visitService.applyCheckIn(input.visitId, {
      visitorCardId: card.id,
      visitorCardNumber: card.cardNumber,
      vehiclePlate,
    })
    this.cardStore.replace(card.id, {
      ...card,
      status: "IN_USE",
      assignedVisitId: updatedVisit.id,
      assignedVisitorName: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName}`,
    })
    return updatedVisit
  }

  async correctVisitor(visitId: string, input: SecurityVisitorCorrectionInput): Promise<Visit> {
    const current = this.visitService.getVisitRecordForSecurity(visitId)
    if (current.status !== "PLANNED" && current.status !== "CHECKED_IN") {
      throw new Error("Yalnızca planlanmış veya içerideki ziyaretlerin bilgileri düzenlenebilir.")
    }

    const firstName = input.firstName.trim()
    const lastName = input.lastName.trim()
    const company = input.company.trim()
    if (!firstName) throw new Error("Ad zorunludur.")
    if (!lastName) throw new Error("Soyad zorunludur.")
    if (!company) throw new Error("Ziyaretçi şirketi zorunludur.")

    const email = normalizeVisitorEmail(input.email)
    if (email && !isValidVisitorEmail(email)) throw new Error("Geçerli bir e-posta adresi girin.")

    const phone = input.phone?.trim() || undefined

    return this.visitService.applyVisitorCorrection(visitId, { firstName, lastName, company, email, phone })
  }
}
