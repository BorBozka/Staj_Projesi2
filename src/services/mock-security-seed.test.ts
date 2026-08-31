import { describe, expect, it } from "vitest"

import { MockSecurityService } from "@/services/mock-security-service"
import { MockVisitService } from "@/services/mock-visit-service"
import { defaultVisitorCards, MockVisitorCardStore } from "@/services/mock-visitor-card-store"
import { initialMockVisitRecords } from "@/services/mock-visit-data"

const seededInsideRecords = initialMockVisitRecords.filter((visit) => visit.status === "CHECKED_IN")

function setup() {
  const cardStore = new MockVisitorCardStore()
  const visitService = new MockVisitService()
  const security = new MockSecurityService(cardStore, visitService)
  return { cardStore, visitService, security }
}

describe("security seed card invariants", () => {
  it("has at least one visitor already inside", () => {
    expect(seededInsideRecords.length).toBeGreaterThan(0)
  })

  it.each(seededInsideRecords.map((visit) => [visit.id, visit] as const))(
    "%s carries a real physical-card assignment consistent with the shared store",
    (_id, visit) => {
      expect(visit.visitorCardId).toBeTruthy()
      expect(visit.visitorCardNumber).toBeTruthy()

      const card = defaultVisitorCards.find((item) => item.id === visit.visitorCardId)
      expect(card).toBeDefined()
      expect(card).toMatchObject({
        status: "IN_USE",
        cardNumber: visit.visitorCardNumber,
        assignedVisitId: visit.id,
        assignedVisitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
      })
    },
  )

  it("keeps the Admin AVAILABLE / NOT_RETURNED / LOST / DISABLED sample cards intact", () => {
    expect(defaultVisitorCards.find((card) => card.id === "card-1")).toMatchObject({ status: "AVAILABLE" })
    expect(defaultVisitorCards.find((card) => card.id === "card-3")).toMatchObject({ status: "NOT_RETURNED" })
    expect(defaultVisitorCards.find((card) => card.id === "card-4")).toMatchObject({ status: "LOST" })
    expect(defaultVisitorCards.find((card) => card.id === "card-5")).toMatchObject({ status: "DISABLED" })
  })
})

describe("security seed checkout behavior", () => {
  it("checks a seeded inside visitor out and releases the card back to AVAILABLE on return", async () => {
    const { cardStore, security } = setup()

    const checkedOut = await security.checkOutVisit({ visitId: "v-today-late", cardReturned: true })

    expect(checkedOut).toMatchObject({ status: "CHECKED_OUT", visitorCardReturned: true })
    expect(checkedOut.actualCheckOut).toBeTruthy()
    expect(cardStore.get("card-2")).toEqual({ id: "card-2", cardNumber: "002", status: "AVAILABLE" })
  })

  it("moves the seeded card to NOT_RETURNED when it is not handed back", async () => {
    const { cardStore, security } = setup()

    await security.checkOutVisit({ visitId: "v-today-overdue", cardReturned: false })

    expect(cardStore.get("card-7")).toMatchObject({ status: "NOT_RETURNED", assignedVisitId: "v-today-overdue" })
  })
})

describe("security seed unresolved card-return count", () => {
  it("is empty for the untouched seed and tracks a real not-returned checkout through its late return", async () => {
    const { security } = setup()

    expect(await security.getUnreturnedVisitorCardIssues()).toEqual([])

    await security.checkOutVisit({ visitId: "v-today-overdue", cardReturned: false })
    const issues = await security.getUnreturnedVisitorCardIssues()
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ card: { id: "card-7" }, visit: { id: "v-today-overdue" } })

    await security.receiveReturnedVisitorCard("v-today-overdue")
    expect(await security.getUnreturnedVisitorCardIssues()).toEqual([])
  })
})
