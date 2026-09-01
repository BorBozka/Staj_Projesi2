import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Visit, VisitTypeOption } from "@/domain/visits"
import { formatLocalVisitorPhone, normalizeVisitorPhone } from "@/lib/phone"
import { securityService } from "@/services"
import { DEFAULT_UNPLANNED_DURATION_MINUTES, getUnplannedDurationError, unplannedDurationOptions } from "./unplanned-visit-utils"

interface SecurityUnplannedVisitDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  onCreated(visit: Visit): void
  scope: { companyId: string; facilityId: string; creatorEmployeeId: string }
  visitTypes: VisitTypeOption[]
}

const emptyDraft = () => ({ firstName: "", lastName: "", company: "", hostEmployeeName: "", visitTypeId: "", phone: "", vehiclePlate: "", durationMinutes: String(DEFAULT_UNPLANNED_DURATION_MINUTES), visitorCardId: "", rulesAccepted: false })

export function SecurityUnplannedVisitDialog({ open, onOpenChange, onCreated, scope, visitTypes }: SecurityUnplannedVisitDialogProps) {
  const [draft, setDraft] = useState(emptyDraft)
  const [cards, setCards] = useState<Awaited<ReturnType<typeof securityService.getAvailableVisitorCards>>>([])
  const [activeRule, setActiveRule] = useState<Awaited<ReturnType<typeof securityService.getActiveVisitorRule>>>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const activeVisitTypes = useMemo(() => visitTypes.filter((type) => type.active), [visitTypes])

  useEffect(() => {
    if (!open) return
    setDraft(emptyDraft())
    setError("")
    setSubmitting(false)
    setLoading(true)
    void Promise.all([securityService.getAvailableVisitorCards(), securityService.getActiveVisitorRule()])
      .then(([nextCards, nextRule]) => { setCards(nextCards); setActiveRule(nextRule) })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Plansız ziyaret için gereken bilgiler yüklenemedi."))
      .finally(() => setLoading(false))
  }, [open])

  const update = <K extends keyof ReturnType<typeof emptyDraft>>(key: K, value: ReturnType<typeof emptyDraft>[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setError("")
  }

  const submit = async () => {
    const required = [[draft.firstName, "Ad"], [draft.lastName, "Soyad"], [draft.company, "Firma"], [draft.hostEmployeeName, "Ev sahibi / ilgili personel"], [draft.visitTypeId, "Ziyaret türü"], [draft.visitorCardId, "Ziyaretçi kartı"]] as const
    const missing = required.find(([value]) => !value.trim())
    if (missing) { setError(`${missing[1]} zorunludur.`); return }
    const durationError = getUnplannedDurationError(draft.durationMinutes)
    if (durationError) { setError(durationError); return }
    if (!draft.rulesAccepted) { setError("Ziyaretçi kuralları kabul edilmelidir."); return }
    if (!activeRule) { setError("Aktif ziyaretçi kuralı bulunamadı."); return }

    setSubmitting(true)
    setError("")
    try {
      const visit = await securityService.createAndCheckInUnplannedVisit({
        firstName: draft.firstName,
        lastName: draft.lastName,
        company: draft.company,
        hostEmployeeName: draft.hostEmployeeName,
        visitTypeId: draft.visitTypeId,
        phone: draft.phone.trim() ? normalizeVisitorPhone(draft.phone) : undefined,
        vehiclePlate: draft.vehiclePlate,
        durationMinutes: Number(draft.durationMinutes),
        visitorCardId: draft.visitorCardId,
        rulesAccepted: draft.rulesAccepted,
        ...scope,
      })
      onCreated(visit)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plansız ziyaret kaydedilemedi.")
      setSubmitting(false)
    }
  }

  const noCardsAvailable = !loading && cards.length === 0
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next) }}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Plansız ziyaret</DialogTitle>
          <DialogDescription>Giriş zamanı şimdi alınır; tahmini süre güvenlik varsayılanı olarak 1 saattir.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Ad" required><Input autoFocus value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} /></Field>
          <Field label="Soyad" required><Input value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} /></Field>
          <Field label="Firma" required><Input value={draft.company} onChange={(event) => update("company", event.target.value)} /></Field>
          <Field label="Ev sahibi / ilgili personel" required><Input value={draft.hostEmployeeName} onChange={(event) => update("hostEmployeeName", event.target.value)} /></Field>
          <Field label="Ziyaret türü" required><Select value={draft.visitTypeId} onChange={(event) => update("visitTypeId", event.target.value)}><option value="">Seçin</option>{activeVisitTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</Select></Field>
          <Field label="Ziyaretçi kartı" required>{loading ? <p className="h-9 pt-2 text-xs text-slate-500">Kartlar yükleniyor…</p> : noCardsAvailable ? <p className="pt-2 text-xs text-amber-700">Uygun ziyaretçi kartı yok.</p> : <Select value={draft.visitorCardId} onChange={(event) => update("visitorCardId", event.target.value)}><option value="">Kart seçin</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.cardNumber}</option>)}</Select>}</Field>
          <Field label="Telefon"><Input type="tel" placeholder="05XX XXX XX XX" value={draft.phone} onChange={(event) => update("phone", formatLocalVisitorPhone(event.target.value))} /></Field>
          <Field label="Plaka"><Input value={draft.vehiclePlate} onChange={(event) => update("vehiclePlate", event.target.value)} /></Field>
        </div>
        <fieldset className="space-y-1.5 rounded-md border bg-slate-50/70 p-2.5">
          <legend className="px-1 text-xs font-medium text-slate-700">Tahmini süre <span className="text-destructive">*</span></legend>
          <div className="flex flex-wrap gap-1.5">{unplannedDurationOptions.map((minutes) => <Button key={minutes} type="button" variant={draft.durationMinutes === String(minutes) ? "default" : "outline"} className="h-7 px-2 text-[11px]" onClick={() => update("durationMinutes", String(minutes))}>{minutes < 60 ? `${minutes} dk` : `${minutes / 60} saat`}</Button>)}</div>
          <div className="flex items-center gap-2"><Label htmlFor="security-unplanned-custom-duration" className="shrink-0 text-[11px] text-slate-500">Özel</Label><Input id="security-unplanned-custom-duration" inputMode="numeric" className="h-8 w-24" value={unplannedDurationOptions.includes(Number(draft.durationMinutes) as typeof unplannedDurationOptions[number]) ? "" : draft.durationMinutes} placeholder="dk" onChange={(event) => update("durationMinutes", event.target.value)} /><span className="text-[11px] text-slate-500">Varsayılanı değiştirmek gerekmez.</span></div>
        </fieldset>
        {activeRule && <label className="flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-xs text-slate-700"><input type="checkbox" className="mt-0.5 size-3.5" checked={draft.rulesAccepted} onChange={(event) => update("rulesAccepted", event.target.checked)} /><span><span className="font-medium">Ziyaretçi kuralları okudu ve kabul etti</span><span className="mt-0.5 block text-[11px] text-slate-500">Kural sürümü {activeRule.version} güvenlik masasında kabul edildi olarak kaydedilir.</span></span></label>}
        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>İptal</Button><Button type="button" disabled={submitting || loading || noCardsAvailable || !activeRule} onClick={() => void submit()}>{submitting ? "Kaydediliyor…" : "Kaydet ve giriş yap"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}{required && <span className="text-destructive"> *</span>}</Label>{children}</div>
}
