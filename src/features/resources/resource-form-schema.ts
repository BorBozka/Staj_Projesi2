import { z } from "zod"

import type { ResourceInput } from "@/domain/resources"

export const resourceFormSchema = z.object({
  type: z.enum(["ROOM", "POOLED_EQUIPMENT"], { required_error: "Kaynak türü zorunludur." }),
  name: z.string().trim().min(1, "Kaynak adı zorunludur."),
  companyId: z.string().min(1, "Şirket zorunludur."),
  facilityId: z.string().min(1, "Tesis zorunludur."),
  totalQuantity: z.string(),
}).superRefine((value, context) => {
  if (value.type !== "POOLED_EQUIPMENT") return
  if (!/^[1-9]\d*$/.test(value.totalQuantity)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totalQuantity"],
      message: "Pozitif bir tam sayı girin.",
    })
  }
})

export type ResourceFormValues = z.infer<typeof resourceFormSchema>

export function toResourceInput(values: ResourceFormValues): ResourceInput {
  return {
    type: values.type,
    name: values.name.trim(),
    companyId: values.companyId,
    facilityId: values.facilityId,
    totalQuantity: values.type === "POOLED_EQUIPMENT" ? Number(values.totalQuantity) : undefined,
  }
}
