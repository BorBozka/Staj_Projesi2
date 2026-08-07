import { z } from "zod"

export const visitFormSchema = z
  .object({
    visitorFirstName: z.string().trim().min(1, "Ad zorunludur."),
    visitorLastName: z.string().trim().min(1, "Soyad zorunludur."),
    visitorEmail: z.string().trim().email("Geçerli bir e-posta adresi girin."),
    visitTypeId: z.string().min(1, "Ziyaret türü zorunludur."),
    hostEmployeeId: z.string().min(1, "İlgili personel zorunludur."),
    hostCompanyId: z.string().min(1, "Ziyaret edilecek şirket zorunludur."),
    facilityId: z.string().min(1, "Tesis zorunludur."),
    visitDate: z.string().min(1, "Tarih zorunludur."),
    startTime: z.string().min(1, "Başlangıç saati zorunludur."),
    endTime: z.string().min(1, "Bitiş saati zorunludur."),
    note: z.string().max(500, "Açıklama en fazla 500 karakter olabilir.").optional(),
  })
  .superRefine((value, context) => {
    if (!value.visitDate || !value.startTime || !value.endTime) return
    const start = new Date(`${value.visitDate}T${value.startTime}:00`)
    const end = new Date(`${value.visitDate}T${value.endTime}:00`)
    if (end <= start) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Bitiş saati başlangıç saatinden sonra olmalıdır." })
    }
  })

export type VisitFormValues = z.infer<typeof visitFormSchema>

export function toVisitInput(values: VisitFormValues) {
  return {
    visitorFirstName: values.visitorFirstName,
    visitorLastName: values.visitorLastName,
    visitorEmail: values.visitorEmail,
    visitTypeId: values.visitTypeId,
    hostEmployeeId: values.hostEmployeeId,
    hostCompanyId: values.hostCompanyId,
    facilityId: values.facilityId,
    plannedStart: new Date(`${values.visitDate}T${values.startTime}:00`).toISOString(),
    plannedEnd: new Date(`${values.visitDate}T${values.endTime}:00`).toISOString(),
    note: values.note,
  }
}
