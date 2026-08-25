import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import { calculateGoodsTrendYAxis, type GoodsMovementTrendPoint } from "@/features/reports/goods-report-utils"
import { ReportChartContainer } from "@/features/reports/ReportChartContainer"
import { getVisitsTrendBarSizing } from "@/features/reports/visits-report-utils"

const COLORS = { INBOUND: "#10b981", OUTBOUND: "#2563eb" } as const

export function GoodsMovementTrendLegend() {
  return <ul className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] font-medium text-slate-600" aria-label="Mal hareketi yönleri"><li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-emerald-500" />Gelen</li><li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-blue-600" />Giden</li></ul>
}

export function GoodsMovementTrendChart({ points, yAxisMax, yAxisTicks, maxXAxisTicks = 10 }: { points: GoodsMovementTrendPoint[]; yAxisMax?: number; yAxisTicks?: number[]; maxXAxisTicks?: number }) {
  if (points.length === 0) return <div className="flex h-full items-center justify-center text-xs text-slate-400">Zaman grafiği için planlanan saat bilgisi bulunmuyor</div>
  const interval = points.length > maxXAxisTicks ? Math.ceil(points.length / maxXAxisTicks) - 1 : 0
  const rawMax = points.reduce((max, point) => Math.max(max, point.INBOUND + point.OUTBOUND), 0)
  const axis = yAxisMax === undefined ? calculateGoodsTrendYAxis(rawMax) : { max: yAxisMax, ticks: yAxisTicks ?? calculateGoodsTrendYAxis(yAxisMax).ticks }
  const sizing = getVisitsTrendBarSizing(points.length)
  return <div className="report-chart h-full cursor-default [contain:paint]" aria-label="Mal hareketi trend grafiği" onPointerDown={(event) => event.preventDefault()}><ReportChartContainer>{({ width, height }) => <BarChart width={width} height={height} accessibilityLayer={false} tabIndex={-1} data={points} margin={{ top: 2, right: 4, left: 0, bottom: 2 }} maxBarSize={sizing.maxBarSize} barCategoryGap={sizing.barCategoryGap}><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval={interval} tickLine={false} axisLine={false} /><YAxis width={34} tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} axisLine={false} domain={[0, axis.max]} ticks={axis.ticks} /><Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ fontSize: 11 }} formatter={(value, name) => [value, name === "INBOUND" ? "Gelen" : "Giden"]} /><Bar dataKey="INBOUND" stackId="direction" fill={COLORS.INBOUND} barSize={sizing.maxBarSize} maxBarSize={sizing.maxBarSize} isAnimationActive={false} /><Bar dataKey="OUTBOUND" stackId="direction" fill={COLORS.OUTBOUND} barSize={sizing.maxBarSize} maxBarSize={sizing.maxBarSize} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart>}</ReportChartContainer></div>
}
