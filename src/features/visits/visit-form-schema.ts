import { z } from "zod"

export const visitFormSchema = z
  .object({
    visitorFirstName: z.string().trim().min(1, "Ad zorunludur."),
    visitorLastName: z.string().trim().min(1, "Soyad zorunludur."),
    visitorEmail: z.string().trim().email("Geçerli bir e-posta adresi girin."),
    phoneCountryCode: z.string().default("+90"),
    customPhoneCountryCode: z.string().trim().optional(),
    visitorPhone: z.string().trim().optional(),
    visitTypeId: z.string().min(1, "Ziyaret türü zorunludur."),
    hostEmployeeName: z.string().trim().min(1, "İlgili personel zorunludur."),
    hostCompanyId: z.string().min(1, "Ziyaret edilecek şirket zorunludur."),
    facilityId: z.string().min(1, "Tesis zorunludur."),
    visitDate: z.string().min(1, "Tarih zorunludur."),
    startTime: z.string().min(1, "Başlangıç saati zorunludur."),
    endTime: z.string().min(1, "Bitiş saati zorunludur."),
    note: z.string().max(500, "Açıklama en fazla 500 karakter olabilir.").optional(),
    hasAdditionalRequirements: z.boolean().default(false),
    additionalRequirementNote: z.string().max(500, "İlave gereksinim notu en fazla 500 karakter olabilir.").optional(),
  })
  .superRefine((value, context) => {
    if (!value.visitDate || !value.startTime || !value.endTime) return
    const start = new Date(`${value.visitDate}T${value.startTime}:00`)
    const end = new Date(`${value.visitDate}T${value.endTime}:00`)
    if (end <= start) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Bitiş saati başlangıç saatinden sonra olmalıdır." })
    }
    if (!value.visitorPhone) return
    if (value.phoneCountryCode === "+90" && !/^5\d{2} \d{3} \d{2} \d{2}$/.test(value.visitorPhone)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["visitorPhone"], message: "Telefon numarasını 5XX XXX XX XX formatında girin." })
    }
    if (value.phoneCountryCode !== "+90" && !/^\d{6,15}$/.test(value.visitorPhone.replace(/\s/g, ""))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["visitorPhone"], message: "Geçerli bir telefon numarası girin." })
    }
    if (value.phoneCountryCode === "other" && !/^\+\d{1,3}$/.test(value.customPhoneCountryCode ?? "")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["customPhoneCountryCode"], message: "Ülke kodunu + ile girin." })
    }
  })

export type VisitFormValues = z.infer<typeof visitFormSchema>

export function toVisitInput(values: VisitFormValues) {
  return {
    visitorFirstName: values.visitorFirstName,
    visitorLastName: values.visitorLastName,
    visitorEmail: values.visitorEmail,
    visitorPhone: values.visitorPhone?.trim()
      ? `${values.phoneCountryCode === "other" ? values.customPhoneCountryCode : values.phoneCountryCode} ${values.visitorPhone.trim()}`
      : undefined,
    visitTypeId: values.visitTypeId,
    hostEmployeeName: values.hostEmployeeName,
    hostCompanyId: values.hostCompanyId,
    facilityId: values.facilityId,
    plannedStart: new Date(`${values.visitDate}T${values.startTime}:00`).toISOString(),
    plannedEnd: new Date(`${values.visitDate}T${values.endTime}:00`).toISOString(),
    note: values.note,
    hasAdditionalRequirements: values.hasAdditionalRequirements,
    additionalRequirementNote: values.hasAdditionalRequirements ? values.additionalRequirementNote?.trim() || undefined : undefined,
  }
}
