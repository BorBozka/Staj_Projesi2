import { describe, expect, it } from "vitest"
import { MockGoodsMovementService } from "@/services/mock-goods-movement-service"
import { MockVisitService } from "@/services/mock-visit-service"

const input = { direction: "INBOUND" as const, companyId: "bplas", facilityId: "bplas-merkez", counterpartyName: "Tedarikçi", plannedDate: "2027-01-20", plannedTime: "10:00", goodsDescription: "Parça", referenceNumber: "REF-1" }
describe("MockGoodsMovementService", () => {
  it("creates a scoped movement and keeps security-only actual fields absent", async () => { const service = new MockGoodsMovementService(new MockVisitService()); const created = await service.createGoodsMovement(input); expect(created).toMatchObject({ direction: "INBOUND", status: "PLANNED", counterpartyName: "Tedarikçi" }); expect(created.actualPlate).toBeUndefined() })
  it("accepts a planned date without a planned time", async () => { const service = new MockGoodsMovementService(new MockVisitService()); const created = await service.createGoodsMovement({ ...input, plannedTime: "" }); expect(created).toMatchObject({ plannedDate: "2027-01-20" }); expect(created.plannedTime).toBeUndefined() })
  it("rejects invalid company/facility scope", async () => { const service = new MockGoodsMovementService(new MockVisitService()); await expect(service.createGoodsMovement({ ...input, facilityId: "otomotiv-uretim" })).rejects.toThrow("eşleşmesi geçersiz") })
  it("cancels planned records and blocks completed record changes", async () => { const service = new MockGoodsMovementService(new MockVisitService()); const created = await service.createGoodsMovement(input); expect((await service.cancelGoodsMovement(created.id)).status).toBe("CANCELLED"); await expect(service.updateGoodsMovement("goods-104", input)).rejects.toThrow("düzenlenemez") })
})
