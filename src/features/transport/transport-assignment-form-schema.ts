import { z } from "zod"

export const transportAssignmentFormSchema = z.object({
  companyId: z.string().min(1, "Şirket zorunludur."),
  facilityId: z.string().min(1, "Tesis zorunludur."),
  date: z.string().min(1, "Tarih zorunludur."),
  startTime: z.string().min(1, "Başlangıç saati zorunludur."),
  endTime: z.string().min(1, "Bitiş saati zorunludur."),
  purpose: z.string().trim().min(1, "Görev/amaç zorunludur."),
  vehicleResourceId: z.string().min(1, "Bir araç seçin."),
  driverResourceId: z.string().min(1, "Bir şoför seçin."),
  relatedKind: z.enum(["none", "meeting", "visit"]),
  relatedId: z.string(),
}).superRefine((value, context) => {
  if (value.relatedKind !== "none" && !value.relatedId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["relatedId"], message: "İlişkili kayıt seçin." })
  }
  if (value.startTime >= value.endTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Bitiş saati başlangıçtan sonra olmalıdır." })
  }
})

export type TransportAssignmentFormValues = z.infer<typeof transportAssignmentFormSchema>
