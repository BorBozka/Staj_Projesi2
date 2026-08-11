import { zodResolver } from "@hookform/resolvers/zod"
import { addHours, setMinutes } from "date-fns"
import { Send } from "lucide-react"
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react"
import { type FieldErrors, useForm } from "react-hook-form"

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
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Visit } from "@/domain/visits"
import { getInvitationActionLabel } from "@/features/visits/invitation-status"
import { useVisits } from "@/features/visits/visit-context"
import { toVisitInput, visitFormSchema, type VisitFormValues } from "@/features/visits/visit-form-schema"
import { formatTr } from "@/lib/date"

const phoneCountryCodes = [
  { value: "+90", label: "Türkiye (+90)" },
  { value: "+1", label: "ABD / Kanada (+1)" },
  { value: "+31", label: "Hollanda (+31)" },
  { value: "+44", label: "Birleşik Krallık (+44)" },
  { value: "+49", label: "Almanya (+49)" },
  { value: "other", label: "Diğer ülke" },
]

function getPhoneDefaults(phone?: string) {
  if (!phone) return { phoneCountryCode: "+90", customPhoneCountryCode: "", visitorPhone: "" }
  const selectedCountry = phoneCountryCodes.find((country) => country.value !== "other" && phone.startsWith(`${country.value} `))
  if (selectedCountry) {
    const localNumber = phone.slice(selectedCountry.value.length).trim()
    return {
      phoneCountryCode: selectedCountry.value,
      customPhoneCountryCode: "",
      visitorPhone: selectedCountry.value === "+90" ? formatMobilePhone(localNumber) : localNumber.replace(/\D/g, ""),
    }
  }
  const [countryCode = "", ...numberParts] = phone.split(/\s+/)
  return { phoneCountryCode: "other", customPhoneCountryCode: countryCode, visitorPhone: numberParts.join("").replace(/\D/g, "") }
}

function defaultsFor(visit?: Visit): VisitFormValues {
  const roundedNow = setMinutes(addHours(new Date(), 1), 0)
  const end = addHours(roundedNow, 1)
  return {
    visitorFirstName: visit?.visitor.firstName ?? "",
    visitorLastName: visit?.visitor.lastName ?? "",
    visitorEmail: visit?.visitor.email ?? "",
    ...getPhoneDefaults(visit?.visitor.phone),
    visitTypeId: visit?.visitTypeId ?? "",
    hostEmployeeName: visit?.hostEmployeeName ?? "",
    hostCompanyId: visit?.hostCompanyId ?? "",
    facilityId: visit?.facilityId ?? "",
    visitDate: formatTr(visit ? new Date(visit.plannedStart) : roundedNow, "yyyy-MM-dd"),
    startTime: formatTr(visit ? new Date(visit.plannedStart) : roundedNow, "HH:mm"),
    endTime: formatTr(visit ? new Date(visit.plannedEnd) : end, "HH:mm"),
    note: visit?.note ?? "",
    hasAdditionalRequirements: visit?.hasAdditionalRequirements ?? false,
    additionalRequirementNote: visit?.additionalRequirementNote ?? "",
  }
}

function formatMobilePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0/, "").slice(0, 10)
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean).join(" ")
}

interface VisitFormDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  visit?: Visit
  onSaved(message: string): void
}

export function VisitFormDialog({ open, onOpenChange, visit, onSaved }: VisitFormDialogProps) {
  const { referenceData, createVisit, updateVisit, sendVisitInvitation } = useVisits()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [savedVisit, setSavedVisit] = useState<Visit | null>(null)
  const [isSendingInvitation, setIsSendingInvitation] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const form = useForm<VisitFormValues>({ resolver: zodResolver(visitFormSchema), defaultValues: defaultsFor(visit), mode: "onChange" })
  const companyId = form.watch("hostCompanyId")
  const phoneCountryCode = form.watch("phoneCountryCode")
  const hasAdditionalRequirements = form.watch("hasAdditionalRequirements")
  const note = form.watch("note")
  const invitationHelpId = useId()
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const formContentRef = useRef<HTMLDivElement | null>(null)
  const { ref: noteFieldRef, ...noteField } = form.register("note")
  const { ref: phoneFieldRef, onChange: onPhoneChange, ...phoneField } = form.register("visitorPhone")

  useEffect(() => {
    if (open) {
      form.reset(defaultsFor(visit))
      setSubmitError(null)
      setSaveNotice(null)
      setSavedVisit(visit ?? null)
      setIsSendingInvitation(false)
      setShowValidationErrors(false)
    }
  }, [form, open, referenceData, visit])

  useEffect(() => {
    const textarea = noteTextareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [note])

  useEffect(() => {
    if (!form.formState.isDirty) return
    setSaveNotice(null)
    setSubmitError(null)
  }, [form.formState.isDirty])

  const facilities = useMemo(
    () => referenceData?.facilities.filter((facility) => facility.companyId === companyId) ?? [],
    [companyId, referenceData],
  )

  const scrollToNextFields = () => {
    window.requestAnimationFrame(() => formContentRef.current?.scrollBy({ top: 160, behavior: "smooth" }))
  }

  const saveVisit = async (values: VisitFormValues) => {
    setSubmitError(null)
    try {
      const currentVisit = savedVisit ?? visit
      const saved = currentVisit
        ? await updateVisit(currentVisit.id, toVisitInput(values))
        : await createVisit(toVisitInput(values))
      setSavedVisit(saved)
      form.reset(defaultsFor(saved))
      await form.trigger()
      const message = "Ziyaret kaydedildi ve güvenliğe iletildi. Davet henüz gönderilmedi."
      setSaveNotice(message)
      onSaved(message)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ziyaret kaydedilemedi.")
    }
  }

  const onInvalidSave = (errors: FieldErrors<VisitFormValues>) => {
    setShowValidationErrors(true)
    const firstInvalidField = Object.keys(errors)[0] as keyof VisitFormValues | undefined
    if (firstInvalidField) window.requestAnimationFrame(() => form.setFocus(firstInvalidField))
  }

  const onSave = form.handleSubmit(saveVisit, onInvalidSave)

  const sendInvitation = async () => {
    const currentVisit = savedVisit ?? visit
    if (!currentVisit || form.formState.isDirty || currentVisit.invitationStatus === "SENT" || isSendingInvitation) return

    setIsSendingInvitation(true)
    setSubmitError(null)
    try {
      const sentVisit = await sendVisitInvitation(currentVisit.id)
      setSavedVisit(sentVisit)
      if (sentVisit.invitationStatus === "FAILED") {
        setSaveNotice(null)
        setSubmitError(sentVisit.invitationError ?? "Davet gönderilemedi.")
        return
      }
      setSaveNotice("Davet başarıyla gönderildi.")
      onSaved("Davet başarıyla gönderildi.")
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Davet gönderilemedi.")
    } finally {
      setIsSendingInvitation(false)
    }
  }

  const currentVisit = savedVisit ?? visit
  const canSendInvitation = Boolean(currentVisit) && !form.formState.isDirty && currentVisit?.invitationStatus !== "SENT" && currentVisit?.invitationStatus !== "SENDING" && !isSendingInvitation
  const invitationDisabledReason = !currentVisit
    ? "Davet göndermek için önce ziyareti kaydedin."
    : form.formState.isDirty
      ? "Davet göndermek için değişiklikleri kaydedin."
      : currentVisit.invitationStatus === "SENT"
        ? "Davet daha önce başarıyla gönderildi."
        : isSendingInvitation || currentVisit.invitationStatus === "SENDING"
          ? "Davet gönderiliyor."
          : "Kayıt hazır; daveti gönderebilirsiniz."

  const fieldError = (name: keyof VisitFormValues) => {
    const message = form.formState.errors[name]?.message
    return showValidationErrors && message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>{visit ? "Ziyareti Düzenle" : "Yeni Ziyaret"}</DialogTitle>
          {visit && <DialogDescription>Davet ve planlama bilgilerini güncelleyin.</DialogDescription>}
        </DialogHeader>

        <form onSubmit={onSave} className="flex min-h-0 flex-col" noValidate>
          <div ref={formContentRef} className="max-h-[calc(90vh-142px)] space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
          <fieldset className="space-y-3 rounded-md border bg-slate-50/60 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Ziyaretçi</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Ad" required error={fieldError("visitorFirstName")}>
                <Input autoFocus {...form.register("visitorFirstName")} />
              </FormField>
              <FormField label="Soyad" required error={fieldError("visitorLastName")}>
                <Input {...form.register("visitorLastName")} />
              </FormField>
              <FormField label="E-posta" required error={fieldError("visitorEmail")} className="sm:col-span-2">
                <Input type="email" placeholder="ziyaretci@firma.com" {...form.register("visitorEmail")} />
              </FormField>
              <FormField label="Telefon (opsiyonel)" error={fieldError("visitorPhone")} className="sm:col-span-2">
                <div className={phoneCountryCode === "other" ? "grid gap-2 sm:grid-cols-[150px_96px_minmax(0,1fr)]" : "grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]"}>
                  <Select {...form.register("phoneCountryCode")} aria-label="Telefon ülke kodu">
                    {phoneCountryCodes.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
                  </Select>
                  {phoneCountryCode === "other" && (
                    <Input
                      placeholder="+ kod"
                      inputMode="numeric"
                      maxLength={4}
                      aria-label="Özel ülke kodu"
                      {...form.register("customPhoneCountryCode", {
                        onChange: (event) => {
                          event.target.value = `+${event.target.value.replace(/\D/g, "").slice(0, 3)}`
                        },
                      })}
                    />
                  )}
                  <Input
                    {...phoneField}
                    ref={phoneFieldRef}
                    type="tel"
                    inputMode="numeric"
                    maxLength={phoneCountryCode === "+90" ? 13 : 15}
                    placeholder={phoneCountryCode === "+90" ? "5XX XXX XX XX" : "Ulusal numara"}
                    onChange={(event) => {
                      event.target.value = phoneCountryCode === "+90"
                        ? formatMobilePhone(event.target.value)
                        : event.target.value.replace(/\D/g, "").slice(0, 15)
                      onPhoneChange(event)
                    }}
                  />
                </div>
              </FormField>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-md border bg-slate-50/60 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Ziyaret Bilgileri</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Ziyaret Türü" required error={fieldError("visitTypeId")}>
                <Select {...form.register("visitTypeId", { onChange: scrollToNextFields })}>
                  <option value="" disabled hidden>Ziyaret türü seçin</option>
                  {referenceData?.visitTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Ziyaret Edilecek Şirket" required error={fieldError("hostCompanyId")}>
                <Select
                  {...form.register("hostCompanyId", {
                    onChange: () => {
                      form.setValue("facilityId", "")
                      scrollToNextFields()
                    },
                  })}
                >
                  <option value="" disabled hidden>Şirket seçin</option>
                  {referenceData?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Tesis" required error={fieldError("facilityId")}>
                <Select
                  {...form.register("facilityId")}
                  disabled={!companyId}
                >
                  <option value="" disabled hidden>Tesis seçin</option>
                  {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                </Select>
              </FormField>
              <FormField label="İlgili Personel" required error={fieldError("hostEmployeeName")}>
                <Input placeholder="Ad Soyad" {...form.register("hostEmployeeName")} />
              </FormField>
              <FormField label="Tarih" required error={fieldError("visitDate")}>
                <Input type="date" {...form.register("visitDate")} />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Başlangıç" required error={fieldError("startTime")}>
                  <Input type="time" {...form.register("startTime")} />
                </FormField>
                <FormField label="Bitiş" required error={fieldError("endTime")}>
                  <Input type="time" {...form.register("endTime")} />
                </FormField>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2 rounded-md border bg-slate-50/60 p-2.5">
            <legend className="px-1 text-xs font-semibold text-slate-700">Ek Bilgi</legend>
            <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register("hasAdditionalRequirements")}
              />
              <span>İlave gereksinim var</span>
            </label>
            {hasAdditionalRequirements && (
              <FormField label="İlave gereksinim notu" error={fieldError("additionalRequirementNote")}>
                <Textarea
                  rows={2}
                  className="min-h-16 resize-y"
                  placeholder="8 kişilik toplantı odası ve projeksiyon gerekiyor."
                  {...form.register("additionalRequirementNote")}
                />
              </FormField>
            )}
            <FormField label="Not / Açıklama" error={fieldError("note")}>
              <Textarea
                {...noteField}
                ref={(element) => {
                  noteFieldRef(element)
                  noteTextareaRef.current = element
                }}
                rows={1}
                className="min-h-9 resize-none overflow-hidden"
                placeholder="Güvenlik veya ilgili personel için isteğe bağlı açıklama"
              />
            </FormField>
          </fieldset>

          {submitError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</p>}
          {saveNotice && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">{saveNotice}</p>}
          </div>

          <DialogFooter className="items-stretch border-t bg-card px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p id={invitationHelpId} className="text-xs text-slate-500" aria-live="polite">{invitationDisabledReason}</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              type="submit"
              variant="outline"
              disabled={form.formState.isSubmitting || isSendingInvitation || (Boolean(currentVisit) && !form.formState.isDirty)}
            >
              {form.formState.isSubmitting ? "Kaydediliyor…" : currentVisit && form.formState.isDirty ? "Değişiklikleri Kaydet" : currentVisit ? "Kaydedildi" : "Ziyareti Kaydet"}
            </Button>
            <Button
              type="button"
              onClick={() => void sendInvitation()}
              disabled={!canSendInvitation || form.formState.isSubmitting}
              aria-describedby={invitationHelpId}
              aria-label={`${currentVisit ? getInvitationActionLabel(currentVisit, isSendingInvitation) : "Daveti Gönder"}. ${invitationDisabledReason}`}
            >
              <Send />
              {currentVisit ? getInvitationActionLabel(currentVisit, isSendingInvitation) : "Daveti Gönder"}
            </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const id = useId()
  const control = isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}{required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </Label>
      <div className="mt-1">{control}</div>
      {error}
    </div>
  )
}
