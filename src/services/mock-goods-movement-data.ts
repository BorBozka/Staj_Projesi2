import type { GoodsMovement } from "@/domain/goods-movements"
import { scenarioAt, scenarioCreatedAt, scenarioDate } from "@/services/mock-scenario"

const scopes = {
  merkez: { companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis" },
  arge: { companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-arge", facilityName: "Ar-Ge Merkezi" },
  otomotiv: { companyId: "bplas-otomotiv", companyName: "BPLAS Otomotiv A.Ş.", facilityId: "otomotiv-uretim", facilityName: "Üretim Tesisi" },
  lojistik: { companyId: "anadolu-lojistik", companyName: "Anadolu Lojistik A.Ş.", facilityId: "anadolu-lojistik-merkez", facilityName: "Lojistik Merkezi" },
} as const

function movement(id: string, dayOffset: number, scope: keyof typeof scopes, direction: GoodsMovement["direction"], counterpartyName: string, goodsDescription: string, plannedTime?: string, status: GoodsMovement["status"] = "PLANNED", extra: Partial<GoodsMovement> = {}): GoodsMovement {
  return { id, direction, ...scopes[scope], counterpartyName, goodsDescription, plannedDate: scenarioDate(dayOffset), plannedTime, status, createdAt: scenarioCreatedAt(Math.min(-1, dayOffset - 1)), ...extra }
}

export const initialMockGoodsMovements: GoodsMovement[] = [
  movement("goods-inbound-polymer", 0, "merkez", "INBOUND", "Sarmal Polimer Ticaret", "PP hammadde numune kolileri", "09:15", "COMPLETED", { actualAt: scenarioAt(0, 9, 28), actualPlate: "16 KRT 218", actualDriverName: "Cihan Ulu" }),
  movement("goods-outbound-samples", 0, "arge", "OUTBOUND", "Marmara Test Laboratuvarı", "Dayanım testi için parça seti", "11:30"),
  movement("goods-inbound-packaging", 0, "otomotiv", "INBOUND", "Poyraz Ambalaj Sanayi", "Üretim hattı için koruyucu ambalaj", "14:00"),
  movement("goods-outbound-return", 0, "lojistik", "OUTBOUND", "Dönüşüm Lojistik", "İade paletleri", "16:45"),
  movement("goods-late-calibration", -1, "arge", "INBOUND", "Kalibrex Ölçüm Sistemleri", "Kalibrasyon cihazı ve referans blokları", "13:00"),
  movement("goods-completed-mould", -1, "otomotiv", "OUTBOUND", "Orsa Kalıp Teknolojileri", "Revizyon için kalıp aparatı", "10:00", "COMPLETED", { actualAt: scenarioAt(-1, 10, 18), actualPlate: "34 ORS 702", actualDriverName: "Serkan Ata" }),
  movement("goods-cancelled-office", -2, "merkez", "INBOUND", "Pusula Ofis Çözümleri", "Arşiv klasörü ve etiket malzemesi", "15:30", "CANCELLED", { note: "Satın alma siparişi konsolide edildi." }),
  movement("goods-completed-pallet", -3, "lojistik", "INBOUND", "Kıyı Ahşap Palet", "EUR palet tedariği", "08:45", "COMPLETED", { actualAt: scenarioAt(-3, 9, 5), actualPlate: "16 KYP 661", actualDriverName: "Onur Savaş" }),
  movement("goods-next-day-resin", 1, "otomotiv", "INBOUND", "Eksen Kimya Dağıtım", "Reçine katkı malzemesi", "10:30", "PLANNED", { referenceNumber: "IRS-PLAN-2408" }),
  movement("goods-next-day-tooling", 1, "merkez", "OUTBOUND", "Kare Teknik Servis", "Bakım için pnömatik el aletleri", "14:15"),
  movement("goods-report-01", -6, "merkez", "INBOUND", "Doru Metalik", "Bağlantı elemanı kutuları", "09:00", "COMPLETED", { actualAt: scenarioAt(-6, 9, 11) }),
  movement("goods-report-02", -10, "arge", "OUTBOUND", "Berrak Analiz Merkezi", "Kimyasal analiz numuneleri", "11:15", "COMPLETED", { actualAt: scenarioAt(-10, 11, 32) }),
  movement("goods-report-03", -15, "otomotiv", "INBOUND", "Vadi Kompozit", "Kompozit levha sevkiyatı", "13:30", "COMPLETED", { actualAt: scenarioAt(-15, 13, 42) }),
  movement("goods-report-04", -20, "lojistik", "OUTBOUND", "Ege Dağıtım Ağı", "Bölgesel müşteri sevkiyatı", "16:00", "COMPLETED", { actualAt: scenarioAt(-20, 16, 20) }),
  movement("goods-previous-01", -34, "merkez", "INBOUND", "Kuzey Hat Tedarik", "Ambalaj ara malzemesi", "09:30", "COMPLETED", { actualAt: scenarioAt(-34, 9, 40) }),
  movement("goods-previous-02", -39, "arge", "OUTBOUND", "Denge Test Hizmetleri", "Prototip numune seti", "12:00", "COMPLETED", { actualAt: scenarioAt(-39, 12, 18) }),
  movement("goods-previous-03", -47, "otomotiv", "INBOUND", "Sera Endüstriyel Gaz", "Koruyucu gaz tüpleri", "10:45", "COMPLETED", { actualAt: scenarioAt(-47, 11, 5) }),
]
