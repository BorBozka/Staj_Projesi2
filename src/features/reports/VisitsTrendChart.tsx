import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import {
  VISITS_REPORT_STATUS_COLORS,
  VISITS_REPORT_STATUS_LABELS,
  type VisitsReportDailyTrendGroupedPoint,
} from "@/features/reports/visits-report-utils"

// Beyond this many daily bars, thin the x-axis tick labels instead of printing every day.
const DEFAULT_MAX_X_AXIS_TICKS = 10

// Recharts' automatic stacked-bar legend order doesn't match declaration order, so the legend
// is rendered explicitly to guarantee Planlandı → Gerçekleşti → Gelişmedi → İptal.
const LEGEND_ORDER = ["PLANNED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const

function renderStatusLegend() {
  return (
    <ul className="flex items-center justify-end gap-3 pb-2 text-[10px] text-slate-600">
      {LEGEND_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1">
          <span className="size-2 rounded-sm" style={{ backgroundColor: VISITS_REPORT_STATUS_COLORS[status] }} />
          {VISITS_REPORT_STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  )
}

// Renders only the chart body, sized to fill its parent (the panel frame, heading and period
// indicator belong to the analysis section in VisitsReportTab so the heading is not duplicated
// here) — the caller is responsible for giving that parent a definite height.
//
// `yAxisMax` fixes the Y domain (e.g. to a value shared with a second, comparison chart) instead
// of each chart auto-scaling to its own data. `showLegend` is false for the second chart in a
// comparison pair so the legend appears once for the whole analysis surface, not per chart.
// `maxXAxisTicks` is lowered when the chart renders at half width (side-by-side comparison) so
// labels don't crowd a narrower plot.
export function VisitsTrendChart({ points, yAxisMax, showLegend = true, maxXAxisTicks = DEFAULT_MAX_X_AXIS_TICKS }: { points: VisitsReportDailyTrendGroupedPoint[]; yAxisMax?: number; showLegend?: boolean; maxXAxisTicks?: number }) {
  if (points.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-slate-400">Veri yok</div>
  }

  const tickInterval = points.length > maxXAxisTicks ? Math.ceil(points.length / maxXAxisTicks) - 1 : 0

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={tickInterval} tickLine={false} axisLine={false} />
          <YAxis width={36} tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} axisLine={false} domain={yAxisMax !== undefined ? [0, yAxisMax] : undefined} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ fontSize: 11 }} formatter={(value, name) => [value, VISITS_REPORT_STATUS_LABELS[String(name) as keyof typeof VISITS_REPORT_STATUS_LABELS] ?? name]} />
          {showLegend && <Legend verticalAlign="top" align="right" content={renderStatusLegend} />}
          <Bar dataKey="PLANNED" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.PLANNED} isAnimationActive={false} />
          <Bar dataKey="COMPLETED" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.COMPLETED} isAnimationActive={false} />
          <Bar dataKey="NO_SHOW" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.NO_SHOW} isAnimationActive={false} />
          <Bar dataKey="CANCELLED" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.CANCELLED} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
