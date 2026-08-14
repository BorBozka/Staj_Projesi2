import { addHours, format, startOfDay } from "date-fns"
import type { GoodsMovement } from "@/domain/goods-movements"

const today = startOfDay(new Date())
export const initialMockGoodsMovements: GoodsMovement[] = [
  { id: "goods-101", direction: "INBOUND", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", counterpartyName: "Kuzey Ambalaj", plannedDate: format(today, "yyyy-MM-dd"), plannedTime: "09:00", goodsDescription: "Ambalaj malzemesi", referenceNumber: "IRS-2026-101", status: "PLANNED", createdAt: today.toISOString() },
  { id: "goods-102", direction: "OUTBOUND", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", counterpartyName: "Ege Endüstri", plannedDate: format(today, "yyyy-MM-dd"), plannedTime: "12:00", goodsDescription: "Numune sevkiyatı", status: "PLANNED", createdAt: today.toISOString() },
  { id: "goods-103", direction: "INBOUND", companyId: "bplas-otomotiv", companyName: "BPLAS Otomotiv A.Ş.", facilityId: "otomotiv-uretim", facilityName: "Üretim Tesisi", counterpartyName: "Mavi Kimya", plannedDate: format(today, "yyyy-MM-dd"), plannedTime: "16:00", goodsDescription: "Hammadde", status: "PLANNED", createdAt: today.toISOString() },
  { id: "goods-104", direction: "OUTBOUND", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-arge", facilityName: "Ar-Ge Merkezi", counterpartyName: "Atlas Lojistik", plannedDate: format(today, "yyyy-MM-dd"), goodsDescription: "Test parçası", status: "COMPLETED", actualAt: addHours(today, -1).toISOString(), actualPlate: "16 BPL 908", actualDriverName: "Mert Kaya", createdAt: today.toISOString() },
]
