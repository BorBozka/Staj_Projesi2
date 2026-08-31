import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { isValidVisitorEmail, type Visit } from "@/domain/visits"
import { securityService } from "@/services"

interface CorrectionDraft {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
}

function draftFor(visit: Visit): CorrectionDraft {
  return {
    firstName: visit.visitor.firstName,
    lastName: visit.visitor.lastName,
    company: visit.visitor.company,
    email: visit.visitor.email ?? "",
    phone: visit.visitor.phone ?? "",
  }
}

interface SecurityVisitorCorrectionDialogProps {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  onSaved(visit: Visit): void
}

export function SecurityVisitorCorrectionDialog({ visit, open, onOpenChange, onSaved }: SecurityVisitorCorrectionDialogProps) {
  const [draft, setDraft] = useState<CorrectionDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && visit) {
      setDraft(draftFor(visit))
      setSaving(false)
      setError(null)
    }
  }, [open, visit])

  if (!visit || !draft) return null

  const firstName = draft.firstName.trim()
  const lastName = draft.lastName.trim()
  const company = draft.company.trim()
  const email = draft.email.trim()
  const emailInvalid = email !== "" && !isValidVisitorEmail(email)
  const invalid = !firstName || !lastName || !company || emailInvalid
  const initial = draftFor(visit)
  const dirty = draft.firstName !== initial.firstName || draft.lastName !== initial.lastName
    || draft.company !== initial.company || draft.email !== initial.email || draft.phone !== initial.phone
  const saveDisabled = invalid || !dirty || saving

  const save = async () => {
    if (saveDisabled) return
    setSaving(true)
    setError(null)
    try {
      const updated = await securityService.correctVisitor(visit.id, {
        firstName,
        lastName,
        company,
        email: email || undefined,
        phone: draft.phone.trim() || undefined,
      })
      onSaved(updated)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ziyaretçi bilgileri kaydedilemedi.")
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <DialogContent className="max-w-sm" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Ziyaretçi Bilgilerini Düzelt</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Ad">
              <Input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
            </Field>
            <Field label="Soyad">
              <Input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
            </Field>
          </div>
          <Field label="Firma">
            <Input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} />
          </Field>
          <Field label="E-posta (opsiyonel)" error={emailInvalid ? "Geçerli bir e-posta adresi girin." : undefined}>
            <Input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
          </Field>
          <Field label="Telefon (opsiyonel)">
            <Input type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          </Field>
        </div>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Vazgeç</Button>
          <Button type="button" disabled={saveDisabled} onClick={() => void save()}>{saving ? "Kaydediliyor…" : "Kaydet"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
      {error && <p className="mt-1 text-[11px] font-medium text-red-700" role="alert">{error}</p>}
    </label>
  )
}
