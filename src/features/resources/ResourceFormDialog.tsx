import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { FacilityResource, ResourceInput } from "@/domain/resources"
import {
  resourceFormSchema,
  type ResourceFormValues,
  toResourceInput,
} from "@/features/resources/resource-form-schema"
import type { VisitReferenceData } from "@/domain/visits"

interface ResourceFormDialogProps {
  open: boolean
  resource: FacilityResource | null
  referenceData: VisitReferenceData
  onOpenChange(open: boolean): void
  onSave(input: ResourceInput): Promise<void>
}

const blankValues: ResourceFormValues = {
  type: "ROOM",
  name: "",
  companyId: "",
  facilityId: "",
  totalQuantity: "",
}

export function ResourceFormDialog({ open, resource, referenceData, onOpenChange, onSave }: ResourceFormDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: blankValues,
    shouldFocusError: false,
  })
  const resourceType = form.watch("type")
  const companyId = form.watch("companyId")
  const facilities = useMemo(
    () => referenceData.facilities.filter((facility) => facility.companyId === companyId),
    [companyId, referenceData.facilities],
  )

  useEffect(() => {
    if (!open) return
    form.reset(resource ? {
      type: resource.type,
      name: resource.name,
      companyId: resource.companyId,
      facilityId: resource.facilityId,
      totalQuantity: resource.totalQuantity ? String(resource.totalQuantity) : "",
    } : blankValues)
    setSubmitError(null)
  }, [form, open, resource])

  const typeRegistration = form.register("type")
  const companyRegistration = form.register("companyId")

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
      const fieldOrder: (keyof ResourceFormValues)[] = ["type", "name", "companyId", "facilityId", "totalQuantity"]
      const firstInvalidField = fieldOrder.find((field) => errors[field])
      if (firstInvalidField) form.setFocus(firstInvalidField)
    },
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{resource ? "Kaynağı düzenle" : "Yeni kaynak"}</DialogTitle>
          <DialogDescription>Kaynağın şirket, tesis ve katalog bilgilerini tanımlayın.</DialogDescription>
        </DialogHeader>

        <form id="resource-form" className="grid gap-3 sm:grid-cols-2" onSubmit={submit} noValidate>
          <FormField label="Kaynak türü" required error={form.formState.errors.type?.message}>
            <Select
              {...typeRegistration}
              aria-invalid={Boolean(form.formState.errors.type)}
              onChange={(event) => {
                void typeRegistration.onChange(event)
                if (event.target.value === "ROOM") form.setValue("totalQuantity", "", { shouldValidate: true })
              }}
            >
              <option value="ROOM">Toplantı odası</option>
              <option value="POOLED_EQUIPMENT">Ekipman havuzu</option>
            </Select>
          </FormField>

          <FormField label="Kaynak adı" required error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} aria-invalid={Boolean(form.formState.errors.name)} autoComplete="off" />
          </FormField>

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
              <option value="">Şirket seçin</option>
              {referenceData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
          </FormField>

          <FormField label="Tesis" required error={form.formState.errors.facilityId?.message}>
            <Select
              {...form.register("facilityId")}
              aria-invalid={Boolean(form.formState.errors.facilityId)}
              disabled={!companyId}
            >
              <option value="">{companyId ? "Tesis seçin" : "Önce şirket seçin"}</option>
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button>
          <Button type="submit" form="resource-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
