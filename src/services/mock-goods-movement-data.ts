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
  movement("goods-security-in-01", 0, "merkez", "INBOUND", "Marmara Çelik Servis ve Ticaret A.Ş.", "Galvanizli sac rulo ve bağlantı elemanları", "08:05", "PLANNED", { referenceNumber: "BPL-2026-0801" }),
  movement("goods-security-in-02", 0, "merkez", "INBOUND", "Umut Endüstriyel Kimya", "Epoksi reçine, sertleştirici ve karışım varilleri", "09:10", "PLANNED"),
  movement("goods-security-in-03", 0, "merkez", "INBOUND", "Kuzey Hat Lojistik", "Üretim hattı için paletli ambalaj malzemesi", "10:25", "PLANNED", { referenceNumber: "IRS-48291" }),
  movement("goods-security-in-04", 0, "merkez", "INBOUND", "Anadolu Endüstriyel Otomasyon ve Danışmanlık Hizmetleri A.Ş.", "PLC panoları, sensör setleri ve saha kablolama ekipmanı", "11:40", "PLANNED"),
  movement("goods-security-in-05", 0, "merkez", "INBOUND", "Poyraz Ambalaj Sanayi", "Karton koli, streç film ve köşe koruyucu sevkiyatı", "12:05", "PLANNED", { referenceNumber: "PO-2026-1198" }),
  movement("goods-security-in-06", 0, "merkez", "INBOUND", "Ege Soğutma Sistemleri", "İklimlendirme yedek parçaları ve kompresör ünitesi", "13:20", "PLANNED"),
  movement("goods-security-in-07", 0, "merkez", "INBOUND", "Berrak Laboratuvar Çözümleri", "Kalite kontrol numuneleri ve laboratuvar sarfı", "14:15", "PLANNED", { referenceNumber: "LAB-7714" }),
  movement("goods-security-in-08", 0, "merkez", "INBOUND", "Sarmal Plastik Teknolojileri", "Granül hammadde big-bag paketleri", "15:00", "PLANNED"),
  movement("goods-security-in-09", 0, "merkez", "INBOUND", "Denge Forklift ve Makine", "Akü grubu ve forklift bakım ekipmanları", "15:05", "PLANNED"),
  movement("goods-security-in-10", 0, "merkez", "INBOUND", "Yeşilova Gıda Tedarik", "Personel yemekhanesi kuru gıda ve temizlik ürünleri", undefined, "PLANNED"),
  movement("goods-security-out-01", 0, "merkez", "OUTBOUND", "Mavi Rota Nakliyat", "Müşteri sevkiyatı: montaj aparatları ve numune setleri", "08:30", "PLANNED", { referenceNumber: "SEV-260801-01" }),
  movement("goods-security-out-02", 0, "merkez", "OUTBOUND", "Güney Otomotiv Yan Sanayi", "Kalıp revizyonu için takım ve fikstür kasaları", "09:45", "PLANNED"),
  movement("goods-security-out-03", 0, "merkez", "OUTBOUND", "Kıyı Ahşap Palet", "Onarılmış EUR palet ve ahşap sandık iadesi", "10:30", "PLANNED", { referenceNumber: "PAL-8830" }),
  movement("goods-security-out-04", 0, "merkez", "OUTBOUND", "Orsa Kalıp Teknolojileri", "Kalıp aparatı, bağlama plakası ve teknik çizim dosyaları", "11:45", "PLANNED"),
  movement("goods-security-out-05", 0, "merkez", "OUTBOUND", "Doru Metalik Yüzey İşlemleri", "Numune parçalar ve yüzey işlem kontrol raporları", "12:10", "PLANNED", { referenceNumber: "DMT-5402" }),
  movement("goods-security-out-06", 0, "merkez", "OUTBOUND", "Kare Teknik Servis", "Arızalı pnömatik el aletleri ve bakım ekipmanı", "13:30", "PLANNED"),
  movement("goods-security-out-07", 0, "merkez", "OUTBOUND", "Vadi Kompozit Ürünler", "Kompozit panel numuneleri ve kalıp deneme parçaları", "14:20", "PLANNED", { referenceNumber: "KMP-2488" }),
  movement("goods-security-out-08", 0, "merkez", "OUTBOUND", "Eksen Kimya Dağıtım", "İade variller ve güvenlik bilgi formları", "15:00", "PLANNED"),
  movement("goods-security-out-09", 0, "merkez", "OUTBOUND", "Sera Endüstriyel Gaz", "Boş azot tüpleri ve tüp kafesi", "15:05", "PLANNED"),
  movement("goods-security-out-10", 0, "merkez", "OUTBOUND", "Yıldız Elektrik Malzeme", "Kablo tamburları, pano kapakları ve sevk evrakı", undefined, "PLANNED"),
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
