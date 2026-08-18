import { visitStatusLabels, type VisitStatus } from "@/domain/visits"
import type { VisitsReportStatusCount } from "@/features/reports/visits-report-utils"

// Same visual language as ManagerDashboard's "Durum Dağılımı" donut (ring + colored legend with
// counts), but a compact, read-only rendering — Reports tabs intentionally have no drill-down.
const STATUS_DONUT_COLORS: Record<VisitStatus, string> = {
  PLANNED: "#3b82f6",
  CHECKED_IN: "#10b981",
  CHECKED_OUT: "#64748b",
  NO_SHOW: "#f59e0b",
  CANCELLED: "#f43f5e",
}

export function VisitsStatusDonut({ counts }: { counts: VisitsReportStatusCount[] }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  const circumference = 2 * Math.PI * 40
  let offset = 0

  return (
    <section className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-panel" aria-label="Ziyaret durum dağılımı">
      <svg viewBox="0 0 100 100" className="size-24 shrink-0" role="img" aria-label={`Toplam ${total} ziyaret durum dağılımı`}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e8edf5" strokeWidth="16" />
        {counts.map((item) => {
          const length = total ? (item.count / total) * circumference : 0
          const currentOffset = offset
          offset += length
          if (length === 0) return null
          return (
            <circle
              key={item.status}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={STATUS_DONUT_COLORS[item.status]}
              strokeWidth="16"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 50 50)"
            />
          )
        })}
        <text x="50" y="47" textAnchor="middle" className="fill-slate-900 text-[20px] font-semibold">{total}</text>
        <text x="50" y="61" textAnchor="middle" className="fill-slate-600 text-[8px]">Toplam</text>
      </svg>
      <ul className="grid gap-1 text-[11px]">
        {counts.map((item) => (
          <li key={item.status} className="flex items-center gap-1.5 text-slate-700">
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: STATUS_DONUT_COLORS[item.status] }} />
            <span className="truncate">{visitStatusLabels[item.status]}</span>
            <span className="ml-auto pl-2 font-semibold tabular-nums text-slate-900">{item.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
