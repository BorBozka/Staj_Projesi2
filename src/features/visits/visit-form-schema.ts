import { z } from "zod"

import { isValidVisitorEmail } from "@/domain/visits"
import { normalizeVisitorPhone } from "@/lib/phone"

const visitorSchema = z.object({
  visitId: z.string().optional(),
  visitorFirstName: z.string().trim().min(1, "Ad zorunludur."),
  visitorLastName: z.string().trim().min(1, "Soyad zorunludur."),
  // Email is optional: blank/whitespace-only is valid, but a non-empty value must be a valid
  // email format.
  visitorEmail: z.string().trim().refine((value) => value === "" || isValidVisitorEmail(value), "Geçerli bir e-posta adresi girin."),
  visitorCompany: z.string().trim().min(1, "Ziyaretçi şirketi zorunludur."),
  visitorPhone: z.string().trim().optional(),
})

export const visitFormSchema = z
  .object({
    visitors: z.array(visitorSchema).min(1, "En az bir ziyaretçi ekleyin."),
    visitTypeId: z.string().min(1, "Ziyaret türü zorunludur."),
    // Only a personnel record picked from the list is accepted; a mistyped name
    // cannot be saved because the id is what the form actually submits.
    hostEmployeeId: z.string().min(1, "İlgili personel zorunludur."),
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
    if (value.visitDate && value.startTime && value.endTime) {
      const start = new Date(`${value.visitDate}T${value.startTime}:00`)
      const end = new Date(`${value.visitDate}T${value.endTime}:00`)
      if (end <= start) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Bitiş saati başlangıç saatinden sonra olmalıdır." })
      }
    }

    value.visitors.forEach((visitor, index) => {
      if (!visitor.visitorPhone) return
      if (!/^0?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(visitor.visitorPhone)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["visitors", index, "visitorPhone"], message: "Telefon numarasını 05XX XXX XX XX formatında girin." })
      }
    })
  })

export type VisitFormValues = z.infer<typeof visitFormSchema>

export function toMeetingInput(values: VisitFormValues) {
  return {
    visitors: values.visitors.map((visitor) => ({
      visitId: visitor.visitId,
      firstName: visitor.visitorFirstName,
      lastName: visitor.visitorLastName,
      email: visitor.visitorEmail.trim() || undefined,
      company: visitor.visitorCompany,
      phone: visitor.visitorPhone?.trim() ? normalizeVisitorPhone(visitor.visitorPhone) : undefined,
    })),
    visitTypeId: values.visitTypeId,
    hostEmployeeId: values.hostEmployeeId,
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
