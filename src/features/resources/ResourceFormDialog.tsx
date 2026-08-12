import { zodResolver } from "@hookform/resolvers/zod"
import { Power, PowerOff } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { resourceTypeLabels, resourceTypes, type FacilityResource, type ResourceInput } from "@/domain/resources"
import type { VisitReferenceData } from "@/domain/visits"
import {
  resourceFormSchema,
  type ResourceFormValues,
  toResourceInput,
} from "@/features/resources/resource-form-schema"

interface ResourceFormDialogProps {
  open: boolean
  resource: FacilityResource | null
  referenceData: VisitReferenceData
  returnFocusRef: React.RefObject<HTMLElement | null>
  onOpenChange(open: boolean): void
  onSave(input: ResourceInput): Promise<void>
  onToggleActive(resource: FacilityResource): Promise<void>
  isTogglingActive: boolean
}

const blankValues: ResourceFormValues = {
  type: "ROOM",
  name: "",
  brand: "",
  model: "",
  licensePlate: "",
  fullName: "",
  licenseClasses: "",
  documents: "",
  canDriveCommercialVehicles: "no",
  companyId: "",
  facilityId: "",
  totalQuantity: "",
}

const typeSpecificFields: (keyof ResourceFormValues)[] = [
  "name",
  "totalQuantity",
  "brand",
  "model",
  "licensePlate",
  "fullName",
  "licenseClasses",
  "documents",
  "canDriveCommercialVehicles",
]

export function ResourceFormDialog({ open, resource, referenceData, returnFocusRef, onOpenChange, onSave, onToggleActive, isTogglingActive }: ResourceFormDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: blankValues,
    shouldFocusError: false,
  })
  const resourceType = form.watch("type")
  const companyId = form.watch("companyId")
  const documents = form.watch("documents")
  const documentsTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const facilities = useMemo(
    () => referenceData.facilities.filter((facility) => facility.companyId === companyId),
    [companyId, referenceData.facilities],
  )

  useEffect(() => {
    if (!open) return
    form.reset(resource ? getResourceFormValues(resource) : blankValues)
    setSubmitError(null)
    setStatusNotice(null)
  }, [form, open, resource])

  useEffect(() => {
    const textarea = documentsTextareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [documents, resourceType])

  const typeRegistration = form.register("type")
  const companyRegistration = form.register("companyId")
  const documentsRegistration = form.register("documents")

  const submit = form.handleSubmit(
    async (values) => {
      setSubmitError(null)
      try {
        await onSave(toResourceInput(values))
        onOpenChange(false)
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Kaynak kaydedilemedi.")
      }
    },
    (errors) => {
      const fieldOrder = getFieldOrder(resourceType)
      const firstInvalidField = fieldOrder.find((field) => errors[field])
      if (firstInvalidField) form.setFocus(firstInvalidField)
    },
  )

  const toggleActive = async () => {
    if (!resource || form.formState.isDirty) return
    setStatusNotice(null)
    try {
      await onToggleActive(resource)
      setStatusNotice(resource.isActive ? "Kaynak pasife alındı." : "Kaynak aktife alındı.")
    } catch {
      // The catalog page surfaces operational errors in its shared feedback area.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{resource ? "Kaynağı düzenle" : "Yeni kaynak"}</DialogTitle>
        </DialogHeader>

        <form id="resource-form" className="grid gap-3 sm:grid-cols-2" onSubmit={submit} noValidate>
          <FormField label="Kaynak türü" required error={form.formState.errors.type?.message}>
            {resource ? (
              <>
                <input type="hidden" {...typeRegistration} />
                <div className="flex h-9 items-center rounded-md border bg-slate-50 px-3 text-sm text-slate-700" aria-label={`Kaynak türü: ${resourceTypeLabels[resource.type]}`}>
                  {resourceTypeLabels[resource.type]}
                </div>
              </>
            ) : (
              <Select
                {...typeRegistration}
                aria-invalid={Boolean(form.formState.errors.type)}
                onChange={(event) => {
                  void typeRegistration.onChange(event)
                  clearTypeSpecificValues(form.setValue)
                  form.clearErrors(typeSpecificFields)
                }}
              >
                {resourceTypes.map((type) => <option key={type} value={type}>{resourceTypeLabels[type]}</option>)}
              </Select>
            )}
          </FormField>

          {(resourceType === "ROOM" || resourceType === "POOLED_EQUIPMENT") && (
            <FormField label="Kaynak adı" required error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} aria-invalid={Boolean(form.formState.errors.name)} autoComplete="off" />
            </FormField>
          )}

          {resourceType === "VEHICLE" && (
            <>
              <FormField label="Marka" required error={form.formState.errors.brand?.message}>
                <Input {...form.register("brand")} aria-invalid={Boolean(form.formState.errors.brand)} autoComplete="off" />
              </FormField>
              <FormField label="Model" required error={form.formState.errors.model?.message}>
                <Input {...form.register("model")} aria-invalid={Boolean(form.formState.errors.model)} autoComplete="off" />
              </FormField>
              <FormField label="Plaka" required error={form.formState.errors.licensePlate?.message}>
                <Input {...form.register("licensePlate")} aria-invalid={Boolean(form.formState.errors.licensePlate)} autoComplete="off" />
              </FormField>
            </>
          )}

          {resourceType === "DRIVER" && (
            <>
              <FormField label="Ad soyad" required error={form.formState.errors.fullName?.message}>
                <Input {...form.register("fullName")} aria-invalid={Boolean(form.formState.errors.fullName)} autoComplete="name" />
              </FormField>
              <FormField label="Ehliyet sınıfları" required error={form.formState.errors.licenseClasses?.message}>
                <Input {...form.register("licenseClasses")} aria-invalid={Boolean(form.formState.errors.licenseClasses)} placeholder="Örn. B, C — virgülle ayırın" autoComplete="off" />
                <p className="mt-1 text-[11px] text-slate-500">Birden fazla ehliyet sınıfını virgülle ayırın.</p>
              </FormField>
              <FormField label="Belgeler" className="sm:col-span-2">
                <Textarea
                  {...documentsRegistration}
                  ref={(element) => {
                    documentsTextareaRef.current = element
                    documentsRegistration.ref(element)
                  }}
                  rows={1}
                  className="h-9 min-h-9 resize-none overflow-hidden"
                  placeholder="Örn. SRC2, Psikoteknik — virgülle ayırın"
                />
                <p className="mt-1 text-[11px] text-slate-500">Birden fazla belgeyi virgülle ayırın.</p>
              </FormField>
              <FormField label="Ticari araç kullanabilir" required className="sm:col-span-2">
                <Select {...form.register("canDriveCommercialVehicles")}>
                  <option value="no">Hayır</option>
                  <option value="yes">Evet</option>
                </Select>
              </FormField>
            </>
          )}

          <FormField label="Şirket" required error={form.formState.errors.companyId?.message}>
            <Select
              {...companyRegistration}
              aria-invalid={Boolean(form.formState.errors.companyId)}
              onChange={(event) => {
                void companyRegistration.onChange(event)
                form.setValue("facilityId", "", { shouldDirty: true, shouldValidate: true })
                form.clearErrors("facilityId")
              }}
            >
              <option value="" disabled hidden>Şirket seçin</option>
              {referenceData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
          </FormField>

          <FormField label="Tesis" required error={form.formState.errors.facilityId?.message}>
            <Select
              {...form.register("facilityId")}
              aria-invalid={Boolean(form.formState.errors.facilityId)}
              disabled={!companyId}
            >
              <option value="" disabled hidden>{companyId ? "Tesis seçin" : "Önce şirket seçin"}</option>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </Select>
          </FormField>

          {resourceType === "POOLED_EQUIPMENT" && (
            <FormField label="Toplam miktar" required error={form.formState.errors.totalQuantity?.message} className="sm:col-span-2">
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                {...form.register("totalQuantity")}
                aria-invalid={Boolean(form.formState.errors.totalQuantity)}
              />
            </FormField>
          )}

          {submitError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 sm:col-span-2" role="alert">{submitError}</p>}
        </form>

        <DialogFooter>
          {resource && (
            <Button
              type="button"
              variant="outline"
              disabled={isTogglingActive || form.formState.isSubmitting || form.formState.isDirty}
              onClick={() => void toggleActive()}
              title={form.formState.isDirty ? "Durumu değiştirmek için form değişikliklerini önce kaydedin." : undefined}
            >
              {resource.isActive ? <PowerOff /> : <Power />}
              {resource.isActive ? "Pasife al" : "Aktife al"}
            </Button>
          )}
          <Button type="submit" form="resource-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </DialogFooter>
        {resource && form.formState.isDirty && <p className="text-right text-[11px] text-slate-500">Durumu değiştirmek için form değişikliklerini önce kaydedin.</p>}
        {statusNotice && <p className="text-right text-xs text-emerald-700" role="status">{statusNotice}</p>}
      </DialogContent>
    </Dialog>
  )
}

function getResourceFormValues(resource: FacilityResource): ResourceFormValues {
  const common = { ...blankValues, type: resource.type, companyId: resource.companyId, facilityId: resource.facilityId }
  switch (resource.type) {
    case "ROOM":
      return { ...common, name: resource.name }
    case "POOLED_EQUIPMENT":
      return { ...common, name: resource.name, totalQuantity: String(resource.totalQuantity) }
    case "VEHICLE":
      return { ...common, brand: resource.brand, model: resource.model, licensePlate: resource.licensePlate }
    case "DRIVER":
      return {
        ...common,
        fullName: resource.fullName,
        licenseClasses: resource.licenseClasses.join(", "),
        documents: resource.documents.join(", "),
        canDriveCommercialVehicles: resource.canDriveCommercialVehicles ? "yes" : "no",
      }
  }
}

function getFieldOrder(type: ResourceFormValues["type"]): (keyof ResourceFormValues)[] {
  const typeFields: Record<ResourceFormValues["type"], (keyof ResourceFormValues)[]> = {
    ROOM: ["name"],
    POOLED_EQUIPMENT: ["name", "totalQuantity"],
    VEHICLE: ["brand", "model", "licensePlate"],
    DRIVER: ["fullName", "licenseClasses"],
  }
  return ["type", ...typeFields[type], "companyId", "facilityId"]
}

function clearTypeSpecificValues(setValue: ReturnType<typeof useForm<ResourceFormValues>>["setValue"]) {
  setValue("name", "")
  setValue("totalQuantity", "")
  setValue("brand", "")
  setValue("model", "")
  setValue("licensePlate", "")
  setValue("fullName", "")
  setValue("licenseClasses", "")
  setValue("documents", "")
  setValue("canDriveCommercialVehicles", "no")
}

function FormField({ label, required, error, className, children }: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-700" role="alert">{error}</span>}
    </label>
  )
}
