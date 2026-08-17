import { z } from "zod"
export const goodsMovementFormSchema = z.object({ direction: z.enum(["INBOUND", "OUTBOUND"]), companyId: z.string().min(1, "Şirket zorunludur."), facilityId: z.string().min(1, "Tesis zorunludur."), plannedDate: z.string().min(1, "Planlanan tarih zorunludur."), plannedTime: z.string(), counterpartyName: z.string().trim().min(1, "Firma zorunludur."), goodsDescription: z.string().trim().min(1, "Mal/açıklama zorunludur."), referenceNumber: z.string(), note: z.string() })
export type GoodsMovementFormValues = z.infer<typeof goodsMovementFormSchema>
