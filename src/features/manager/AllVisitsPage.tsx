import { Search } from "lucide-react"
import { isSameDay } from "date-fns"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { VisitStatus } from "@/domain/visits"
import { VisitDetailsDialog } from "@/features/visits/VisitDetailsDialog"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"

const statusOptions: { value: "all" | VisitStatus; label: string }[] = [
  { value: "all", label: "Tüm durumlar" },
  { value: "PLANNED", label: "Planlandı" },
  { value: "CHECKED_IN", label: "İçeride" },
  { value: "CHECKED_OUT", label: "Çıkış yapıldı" },
  { value: "CANCELLED", label: "İptal edildi" },
  { value: "NO_SHOW", label: "Gelmedi" },
]

export function AllVisitsPage() {
  const { visits, referenceData, isLoading } = useVisits()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [date, setDate] = useState(() => searchParams.get("date") ?? "")
  const [facilityId, setFacilityId] = useState("all")
  const [status, setStatus] = useState<"all" | VisitStatus>(() => {
    const value = searchParams.get("status")
    return statusOptions.some((option) => option.value === value) ? value as VisitStatus : "all"
  })
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)

  const filteredVisits = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase("tr-TR")
    return visits.filter((visit) => {
      const visitDate = new Date(visit.plannedStart)
      const searchableText = `${visit.visitor.firstName} ${visit.visitor.lastName} ${visit.hostEmployeeName} ${visit.hostCompanyName}`.toLocaleLowerCase("tr-TR")
      return (!searchTerm || searchableText.includes(searchTerm))
        && (!date || isSameDay(visitDate, new Date(`${date}T00:00:00`)))
        && (facilityId === "all" || visit.facilityId === facilityId)
        && (status === "all" || visit.status === status)
    })
  }, [date, facilityId, search, status, visits])
  const selectedVisit = visits.find((visit) => visit.id === selectedVisitId) ?? null

  if (isLoading || !referenceData) return <AllVisitsSkeleton />

  return (
    <div className="space-y-3">
      <section className="rounded-lg border bg-card p-3 shadow-panel">
        <h1 className="text-base font-semibold">Tüm Ziyaretler</h1>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block"><span className="sr-only">Ziyaret ara</span><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ziyaretçi, ev sahibi veya şirket ara" className="pl-8" /></label>
          <label className="text-xs font-medium text-muted-foreground">Tarih<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="text-xs font-medium text-muted-foreground">Tesis<Select value={facilityId} onChange={(event) => setFacilityId(event.target.value)}><option value="all">Tüm tesisler</option>{referenceData.facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</Select></label>
          <label className="text-xs font-medium text-muted-foreground">Durum<Select value={status} onChange={(event) => setStatus(event.target.value as "all" | VisitStatus)}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card shadow-panel">
        <div className="flex items-center justify-between border-b px-3 py-2.5"><h2 className="text-sm font-semibold">Ziyaret kayıtları</h2><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{filteredVisits.length}</span></div>
        {filteredVisits.length === 0 ? <p className="px-3 py-10 text-center text-xs text-muted-foreground">Seçili filtrelere uygun ziyaret bulunmuyor.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="border-b bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Ziyaretçi</th><th className="px-3 py-2">Ev sahibi</th><th className="px-3 py-2">Şirket / tesis</th><th className="px-3 py-2">Planlanan zaman</th><th className="px-3 py-2">Durum</th></tr></thead><tbody className="divide-y">{filteredVisits.map((visit) => <tr key={visit.id} className="cursor-pointer hover:bg-slate-50 focus-within:bg-slate-50" onClick={() => setSelectedVisitId(visit.id)}><td className="px-3 py-2.5 font-semibold">{visit.visitor.firstName} {visit.visitor.lastName}</td><td className="px-3 py-2.5">{visit.hostEmployeeName}</td><td className="px-3 py-2.5"><p>{visit.hostCompanyName}</p><p className="mt-0.5 text-muted-foreground">{visit.facilityName}</p></td><td className="px-3 py-2.5 tabular-nums">{formatTr(new Date(visit.plannedStart), "d MMM yyyy · HH:mm")}–{formatTr(new Date(visit.plannedEnd), "HH:mm")}</td><td className="px-3 py-2.5"><VisitStatusBadge status={visit.status} compact /></td></tr>)}</tbody></table></div>}
      </section>

      <VisitDetailsDialog visit={selectedVisit} open={Boolean(selectedVisit)} onOpenChange={(open) => !open && setSelectedVisitId(null)} onEdit={() => undefined} onReschedule={() => undefined} onCancel={() => undefined} readOnly />
    </div>
  )
}

function AllVisitsSkeleton() { return <div className="h-80 animate-pulse rounded-lg border bg-slate-100" /> }
