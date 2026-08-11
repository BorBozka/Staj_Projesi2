import { Building2, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useManagerRefresh } from "@/features/manager/manager-refresh-context"
import { useVisits } from "@/features/visits/visit-context"

export function ManagerDashboardFilters() {
  const { referenceData } = useVisits()
  const { companyId, facilityId, selectCompany, selectFacility } = useManagerRefresh()

  if (!referenceData) return null

  const facilities = referenceData.facilities.filter((facility) => companyId === "all" || facility.companyId === companyId)
  const companyName = companyId === "all"
    ? "Tümü"
    : referenceData.companies.find((company) => company.id === companyId)?.name ?? "Tümü"
  const facilityName = facilityId === "all"
    ? "Tümü"
    : referenceData.facilities.find((facility) => facility.id === facilityId)?.name ?? "Tümü"
  const summary = `Şirket: ${companyName} · Tesis: ${facilityName}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-[min(22rem,calc(100vw-7.5rem))] justify-start gap-1.5 bg-white text-slate-700 shadow-none"
          aria-label={`Dashboard kapsamı. ${summary}`}
        >
          <Building2 className="size-3.5" />
          <span className="truncate">{summary}</span>
          <ChevronDown className="ml-auto size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[min(32rem,calc(100vh-2rem))] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto p-1.5" aria-label="Dashboard kapsamını seç">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm text-slate-900">Şirket</DropdownMenuLabel>
          <button
            type="button"
            className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => selectCompany("all")}
          >
            Tüm kapsam
          </button>
        </div>
        <DropdownMenuRadioGroup value={companyId} onValueChange={selectCompany}>
          {referenceData.companies.map((company) => (
            <DropdownMenuRadioItem key={company.id} value={company.id} onSelect={(event) => event.preventDefault()} className="data-[state=checked]:bg-blue-50 data-[state=checked]:font-medium data-[state=checked]:text-blue-900">{company.name}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-sm text-slate-900">Tesis</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={facilityId} onValueChange={selectFacility}>
          {facilities.map((facility) => (
            <DropdownMenuRadioItem key={facility.id} value={facility.id} onSelect={(event) => event.preventDefault()} className="data-[state=checked]:bg-blue-50 data-[state=checked]:font-medium data-[state=checked]:text-blue-900">{facility.name}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
