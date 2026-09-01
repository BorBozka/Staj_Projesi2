import { afterEach, describe, expect, it, vi } from "vitest"
import { MockGoodsMovementService } from "@/services/mock-goods-movement-service"
import { MockVisitService } from "@/services/mock-visit-service"
import { filterGoodsMovementsForReport } from "@/features/reports/goods-report-utils"

const input = { direction: "INBOUND" as const, companyId: "bplas", facilityId: "bplas-merkez", counterpartyName: "Tedarikçi", plannedDate: "2027-01-20", plannedTime: "10:00", goodsDescription: "Parça", referenceNumber: "REF-1" }
describe("MockGoodsMovementService", () => {
  afterEach(() => vi.useRealTimers())
  it("creates a scoped movement and keeps security-only actual fields absent", async () => { const service = new MockGoodsMovementService(new MockVisitService()); const created = await service.createGoodsMovement(input); expect(created).toMatchObject({ direction: "INBOUND", status: "PLANNED", counterpartyName: "Tedarikçi" }); expect(created.actualPlate).toBeUndefined() })
  it("accepts a planned date without a planned time", async () => { const service = new MockGoodsMovementService(new MockVisitService()); const created = await service.createGoodsMovement({ ...input, plannedTime: "" }); expect(created).toMatchObject({ plannedDate: "2027-01-20" }); expect(created.plannedTime).toBeUndefined() })
  it("rejects invalid company/facility scope", async () => { const service = new MockGoodsMovementService(new MockVisitService()); await expect(service.createGoodsMovement({ ...input, facilityId: "otomotiv-uretim" })).rejects.toThrow("eşleşmesi geçersiz") })
  it("cancels planned records and blocks completed record changes", async () => { const service = new MockGoodsMovementService(new MockVisitService()); const created = await service.createGoodsMovement(input); expect((await service.cancelGoodsMovement(created.id)).status).toBe("CANCELLED"); await expect(service.updateGoodsMovement("goods-inbound-polymer", input)).rejects.toThrow("düzenlenemez") })
  it("completes a scoped planned record with service-owned actual time and trimmed desk details", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-01T08:00:00.000Z"))
    const service = new MockGoodsMovementService(new MockVisitService())
    const created = await service.createGoodsMovement(input)

    const completed = await service.completeGoodsMovement(created.id, { companyId: "bplas", facilityId: "bplas-merkez", actualPlate: " 34 ABC 123 ", actualDriverName: " Aylin Demir " })

    expect(completed).toMatchObject({ status: "COMPLETED", actualAt: "2026-09-01T08:00:00.000Z", actualPlate: "34 ABC 123", actualDriverName: "Aylin Demir" })
    const sharedMovements = await service.listGoodsMovements()
    expect(sharedMovements.find((movement) => movement.id === created.id)).toMatchObject({ status: "COMPLETED", actualDriverName: "Aylin Demir" })
    expect(filterGoodsMovementsForReport(sharedMovements, { companyId: "bplas", facilityId: "bplas-merkez", startDate: "2027-01-20", endDate: "2027-01-20" }).find((movement) => movement.id === created.id)).toMatchObject({ status: "COMPLETED", actualPlate: "34 ABC 123" })
  })
  it("rejects out-of-scope and terminal completion attempts", async () => {
    const service = new MockGoodsMovementService(new MockVisitService())
    const created = await service.createGoodsMovement(input)

    await expect(service.completeGoodsMovement(created.id, { companyId: "bplas", facilityId: "bplas-arge" })).rejects.toThrow("kapsamı dışında")
    await service.completeGoodsMovement(created.id, { companyId: "bplas", facilityId: "bplas-merkez" })
    await expect(service.completeGoodsMovement(created.id, { companyId: "bplas", facilityId: "bplas-merkez" })).rejects.toThrow("planlanmış")
    await expect(service.completeGoodsMovement("goods-inbound-polymer", { companyId: "bplas", facilityId: "bplas-merkez" })).rejects.toThrow("planlanmış")
  })
})
