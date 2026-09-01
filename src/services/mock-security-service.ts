import type { VisitorCardInventoryItem, VisitorRuleVersion } from "@/domain/admin"
import { isValidVisitorEmail, normalizeVehiclePlate, normalizeVisitorEmail, type Visit } from "@/domain/visits"
import type { MockVisitService } from "@/services/mock-visit-service"
import type { MockVisitorCardStore } from "@/services/mock-visitor-card-store"
import { MockVisitorRuleStore } from "@/services/mock-visitor-rule-store"
import type { CreateUnplannedVisitInput, SecurityCardIssue, SecurityCheckInInput, SecurityCheckOutInput, SecurityService, SecurityVisitorCorrectionInput } from "@/services/security-service"

export class MockSecurityService implements SecurityService {
  constructor(
    private readonly cardStore: MockVisitorCardStore,
    private readonly visitService: MockVisitService,
    private readonly ruleStore: MockVisitorRuleStore = new MockVisitorRuleStore(),
  ) {}

  async getAvailableVisitorCards(): Promise<VisitorCardInventoryItem[]> {
    return this.cardStore.list().filter((card) => card.status === "AVAILABLE")
  }

  async getActiveVisitorRule(): Promise<VisitorRuleVersion | null> {
    return this.ruleStore.getActive()
  }

  async createAndCheckInUnplannedVisit(input: CreateUnplannedVisitInput): Promise<Visit> {
    const firstName = input.firstName.trim()
    const lastName = input.lastName.trim()
    const company = input.company.trim()
    const hostEmployeeName = input.hostEmployeeName.trim()
    if (!firstName) throw new Error("Ad zorunludur.")
    if (!lastName) throw new Error("Soyad zorunludur.")
    if (!company) throw new Error("Ziyaretçi şirketi zorunludur.")
    if (!hostEmployeeName) throw new Error("Ev sahibi zorunludur.")
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) throw new Error("Tahmini süre pozitif bir tam sayı dakika olmalıdır.")
    if (!input.rulesAccepted) throw new Error("Ziyaretçi kuralları kabul edilmelidir.")

    const card = this.cardStore.get(input.visitorCardId)
    if (!card) throw new Error("Ziyaretçi kartı bulunamadı.")
    if (card.status !== "AVAILABLE") throw new Error("Seçilen kart şu anda kullanılabilir değil.")
    const rule = this.ruleStore.getActive()
    if (!rule) throw new Error("Aktif ziyaretçi kuralı bulunamadı.")

    const checkedInAt = new Date()
    const plannedStart = checkedInAt.toISOString()
    const plannedEnd = new Date(checkedInAt.getTime() + input.durationMinutes * 60_000).toISOString()
    const visit = this.visitService.createUnplannedCheckedInVisit({
      firstName, lastName, company, hostEmployeeName, visitTypeId: input.visitTypeId.trim(),
      phone: input.phone?.trim() || undefined, vehiclePlate: normalizeVehiclePlate(input.vehiclePlate),
      plannedStart, plannedEnd, creatorEmployeeId: input.creatorEmployeeId,
      hostCompanyId: input.companyId, facilityId: input.facilityId,
      visitorCardId: card.id, visitorCardNumber: card.cardNumber,
      ruleAcceptance: { ruleId: rule.id, ruleVersion: rule.version, acceptedAt: plannedStart, method: "SECURITY_DESK", contentSnapshot: rule.content },
    })
    this.cardStore.replace(card.id, { ...card, status: "IN_USE", assignedVisitId: visit.id, assignedVisitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}` })
    return visit
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
    const phone = input.phone?.trim() || undefined
    const updatedVisit = this.visitService.applyCheckIn(input.visitId, {
      visitorCardId: card.id,
      visitorCardNumber: card.cardNumber,
      vehiclePlate,
      phone,
    })
    this.cardStore.replace(card.id, {
      ...card,
      status: "IN_USE",
      assignedVisitId: updatedVisit.id,
      assignedVisitorName: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName}`,
    })
    return updatedVisit
  }

  async checkOutVisit(input: SecurityCheckOutInput): Promise<Visit> {
    const current = this.visitService.getVisitRecordForSecurity(input.visitId)
    if (current.status !== "CHECKED_IN") throw new Error("Yalnızca içerideki ziyaretçiler çıkış yapabilir.")
    if (!current.visitorCardId) throw new Error("Ziyaret için atanmış fiziksel kart bulunamadı.")

    const card = this.cardStore.get(current.visitorCardId)
    if (!card || card.status !== "IN_USE" || card.assignedVisitId !== current.id) {
      throw new Error("Ziyaretin atanmış kartı kullanımda değil.")
    }

    const { visit } = await this.visitService.checkoutVisit(current.id, { visitorCardReturned: input.cardReturned })
    this.cardStore.replace(card.id, input.cardReturned
      ? { id: card.id, cardNumber: card.cardNumber, status: "AVAILABLE" }
      : { ...card, status: "NOT_RETURNED" })
    return visit
  }

  async getUnreturnedVisitorCardIssues(): Promise<SecurityCardIssue[]> {
    const visits = await this.visitService.listVisits()
    return this.cardStore.list()
      .filter((card) => card.status === "NOT_RETURNED" && Boolean(card.assignedVisitId))
      .flatMap((card) => {
        const visit = visits.find((item) => item.id === card.assignedVisitId
          && item.status === "CHECKED_OUT" && item.visitorCardReturned === false)
        return visit ? [{ card, visit }] : []
      })
  }

  async receiveReturnedVisitorCard(visitId: string): Promise<Visit> {
    const current = this.visitService.getVisitRecordForSecurity(visitId)
    if (current.status !== "CHECKED_OUT" || !current.visitorCardId) {
      throw new Error("Kart iadesi için uygun ziyaret kaydı bulunamadı.")
    }
    const card = this.cardStore.get(current.visitorCardId)
    if (!card || card.status !== "NOT_RETURNED" || card.assignedVisitId !== current.id) {
      throw new Error("Yalnız iade edilmemiş atanmış kart teslim alınabilir.")
    }

    const updatedVisit = this.visitService.applyLateVisitorCardReturn(current.id)
    this.cardStore.replace(card.id, { id: card.id, cardNumber: card.cardNumber, status: "AVAILABLE" })
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
    const hostEmployeeName = input.hostEmployeeName.trim()
    if (!firstName) throw new Error("Ad zorunludur.")
    if (!lastName) throw new Error("Soyad zorunludur.")
    if (!company) throw new Error("Ziyaretçi şirketi zorunludur.")
    if (!hostEmployeeName) throw new Error("Ev sahibi zorunludur.")

    const phone = input.phone?.trim() || undefined
    const visitTypeId = input.visitTypeId?.trim() || undefined

    // email is only applied when the caller actually passed the field. The dialog no longer
    // sends it, so an omitted email leaves visitor.email untouched; an explicit value (even a
    // blank one, which clears it) still flows through.
    if (input.email === undefined) {
      return this.visitService.applyVisitorCorrection(visitId, { firstName, lastName, company, phone, hostEmployeeName, visitTypeId })
    }
    const email = normalizeVisitorEmail(input.email)
    if (email && !isValidVisitorEmail(email)) throw new Error("Geçerli bir e-posta adresi girin.")
    return this.visitService.applyVisitorCorrection(visitId, { firstName, lastName, company, email, phone, hostEmployeeName, visitTypeId })
  }
}
