import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import {
  calculateVisitsTrendYAxis,
  getVisitsTrendBarSizing,
  getVisitsTrendTooltipPeriodContext,
  VISITS_REPORT_STATUS_COLORS,
  VISITS_REPORT_STATUS_LABELS,
  type VisitsReportDailyTrendGroupedPoint,
} from "@/features/reports/visits-report-utils"

const DEFAULT_MAX_X_AXIS_TICKS = 10
const LEGEND_ORDER = ["PLANNED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const

export function VisitsTrendLegend() {
  return (
    <ul className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] font-medium text-slate-600" aria-label="Ziyaret durumları">
      {LEGEND_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: VISITS_REPORT_STATUS_COLORS[status] }} aria-hidden="true" />
          {VISITS_REPORT_STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  )
}

// The parent owns the analysis layout. This component applies the common bar sizing and a
// deterministic Y grid for every hourly, daily and weekly view.
export function VisitsTrendChart({ points, yAxisMax, yAxisTicks, maxXAxisTicks = DEFAULT_MAX_X_AXIS_TICKS }: {
  points: VisitsReportDailyTrendGroupedPoint[]
  yAxisMax?: number
  yAxisTicks?: number[]
  maxXAxisTicks?: number
}) {
  if (points.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-slate-400">Veri yok</div>
  }

  const tickInterval = points.length > maxXAxisTicks ? Math.ceil(points.length / maxXAxisTicks) - 1 : 0
  const ownRawMax = points.reduce((max, point) => Math.max(max, point.PLANNED + point.COMPLETED + point.NO_SHOW + point.CANCELLED), 0)
  const axis = yAxisMax === undefined ? calculateVisitsTrendYAxis(ownRawMax) : { max: yAxisMax, ticks: yAxisTicks ?? calculateVisitsTrendYAxis(yAxisMax).ticks }
  const barSizing = getVisitsTrendBarSizing(points.length)

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 2, right: 4, left: 0, bottom: 2 }} maxBarSize={barSizing.maxBarSize} barCategoryGap={barSizing.barCategoryGap}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={tickInterval} tickLine={false} axisLine={false} />
          <YAxis width={34} tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} axisLine={false} domain={[0, axis.max]} ticks={axis.ticks} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ fontSize: 11 }}
            labelFormatter={(label, payload) => {
              const point = payload[0]?.payload as VisitsReportDailyTrendGroupedPoint | undefined
              const periodContext = getVisitsTrendTooltipPeriodContext(point)
              return (
                <div>
                  <p>{`Zaman aralığı: ${String(label).replace("–", " – ")}`}</p>
                  {periodContext && <p className="mt-0.5 text-[10px] font-normal text-slate-500">{periodContext}</p>}
                </div>
              )
            }}
            formatter={(value, name) => [value, VISITS_REPORT_STATUS_LABELS[String(name) as keyof typeof VISITS_REPORT_STATUS_LABELS] ?? name]}
          />
          <Bar dataKey="PLANNED" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.PLANNED} barSize={barSizing.maxBarSize} maxBarSize={barSizing.maxBarSize} isAnimationActive={false} />
          <Bar dataKey="COMPLETED" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.COMPLETED} barSize={barSizing.maxBarSize} maxBarSize={barSizing.maxBarSize} isAnimationActive={false} />
          <Bar dataKey="NO_SHOW" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.NO_SHOW} barSize={barSizing.maxBarSize} maxBarSize={barSizing.maxBarSize} isAnimationActive={false} />
          <Bar dataKey="CANCELLED" stackId="status" fill={VISITS_REPORT_STATUS_COLORS.CANCELLED} barSize={barSizing.maxBarSize} maxBarSize={barSizing.maxBarSize} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
