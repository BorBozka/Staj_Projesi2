import { Select } from "@/components/ui/select"
import { useManagerRefresh } from "@/features/manager/manager-refresh-context"
import { useVisits } from "@/features/visits/visit-context"
import { cn } from "@/lib/utils"

export function ManagerDashboardFilters({ placement, className }: { placement: "header" | "content"; className?: string }) {
  const { referenceData } = useVisits()
  const { companyId, facilityId, selectCompany, selectFacility } = useManagerRefresh()

  if (!referenceData) return null

  const facilities = referenceData.facilities.filter((facility) => companyId === "all" || facility.companyId === companyId)
  const inHeader = placement === "header"

  return (
    <section
      className={cn(inHeader ? "items-center gap-3" : "flex-wrap items-center gap-3", className)}
      aria-label="Şirket ve tesis filtreleri"
    >
      <label className={cn("flex items-center text-slate-700", inHeader ? "gap-1.5 text-xs font-medium" : "gap-2 text-sm font-semibold")}>
        <span>Şirket:</span>
        <Select
          className={cn("truncate", inHeader ? "h-9 w-[184px] text-xs" : "w-56 max-w-[calc(100vw-92px)]")}
          value={companyId}
          onChange={(event) => selectCompany(event.target.value)}
        >
          <option value="all">Tüm şirketler</option>
          {referenceData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </Select>
      </label>
      <label className={cn("flex items-center text-slate-700", inHeader ? "gap-1.5 text-xs font-medium" : "gap-2 text-sm font-semibold")}>
        <span>Tesis:</span>
        <Select
          className={cn("truncate", inHeader ? "h-9 w-[184px] text-xs" : "w-56 max-w-[calc(100vw-82px)]")}
          value={facilityId}
          onChange={(event) => selectFacility(event.target.value)}
        >
          <option value="all">Tüm tesisler</option>
          {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
        </Select>
      </label>
    </section>
  )
}
