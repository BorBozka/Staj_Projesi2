import { z } from "zod"

import { resourceTypes, type ResourceInput } from "@/domain/resources"

export const resourceFormSchema = z.object({
  type: z.enum(resourceTypes, { required_error: "Kaynak türü zorunludur." }),
  name: z.string(),
  brand: z.string(),
  model: z.string(),
  licensePlate: z.string(),
  fullName: z.string(),
  licenseClasses: z.string(),
  documents: z.string(),
  canDriveCommercialVehicles: z.enum(["yes", "no"]),
  companyId: z.string().min(1, "Şirket zorunludur."),
  facilityId: z.string().min(1, "Tesis zorunludur."),
  totalQuantity: z.string(),
}).superRefine((value, context) => {
  if (value.type === "ROOM" || value.type === "POOLED_EQUIPMENT") {
    addRequiredIssue(context, value.name, "name", "Kaynak adı zorunludur.")
  }
  if (value.type === "POOLED_EQUIPMENT" && !/^[1-9]\d*$/.test(value.totalQuantity)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totalQuantity"],
      message: "Pozitif bir tam sayı girin.",
    })
  }
  if (value.type === "VEHICLE") {
    addRequiredIssue(context, value.brand, "brand", "Marka zorunludur.")
    addRequiredIssue(context, value.model, "model", "Model zorunludur.")
    addRequiredIssue(context, value.licensePlate, "licensePlate", "Plaka zorunludur.")
  }
  if (value.type === "DRIVER") {
    addRequiredIssue(context, value.fullName, "fullName", "Ad soyad zorunludur.")
    if (parseList(value.licenseClasses).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["licenseClasses"],
        message: "En az bir ehliyet sınıfı girin.",
      })
    }
  }
})

export type ResourceFormValues = z.infer<typeof resourceFormSchema>

export function toResourceInput(values: ResourceFormValues): ResourceInput {
  const common = { companyId: values.companyId, facilityId: values.facilityId }
  switch (values.type) {
    case "ROOM":
      return { ...common, type: "ROOM", name: values.name.trim() }
    case "POOLED_EQUIPMENT":
      return { ...common, type: "POOLED_EQUIPMENT", name: values.name.trim(), totalQuantity: Number(values.totalQuantity) }
    case "VEHICLE":
      return {
        ...common,
        type: "VEHICLE",
        brand: values.brand.trim(),
        model: values.model.trim(),
        licensePlate: values.licensePlate.trim(),
      }
    case "DRIVER":
      return {
        ...common,
        type: "DRIVER",
        fullName: values.fullName.trim(),
        licenseClasses: parseList(values.licenseClasses),
        documents: parseList(values.documents),
        canDriveCommercialVehicles: values.canDriveCommercialVehicles === "yes",
      }
  }
}

function addRequiredIssue(
  context: z.RefinementCtx,
  value: string,
  field: keyof ResourceFormValues,
  message: string,
) {
  if (!value.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
  }
}

function parseList(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
}
