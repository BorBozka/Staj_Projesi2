import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatDurationMinutes } from "@/features/reports/report-format"
import {
  getFleetCategoryAxisWidth,
  getNiceFleetDurationScale,
  truncateFleetCategoryLabel,
  type FleetLoadComparisonResource,
  type FleetLoadResource,
  type FleetReportDimension,
} from "@/features/reports/fleet-report-utils"

type ChartResource = FleetLoadResource | FleetLoadComparisonResource

function hasPrevious(resource: ChartResource): resource is FleetLoadComparisonResource {
  return "previousPlannedMinutes" in resource
}

export function FleetLoadChart({ resources, dimension, comparison = false, comparisonLabel = "Önceki dönem", totalResourceCount = resources.length }: { resources: ChartResource[]; dimension: FleetReportDimension; comparison?: boolean; comparisonLabel?: string; totalResourceCount?: number }) {
  if (resources.length === 0) return <div className="flex h-full items-center justify-center text-xs text-slate-400">Aktif planlama yükü bulunmuyor</div>

  const data = resources.map((resource) => ({
    ...resource,
    label: resource.resourceName,
    secondary: `${formatDurationMinutes(resource.plannedMinutes)} · ${resource.assignmentCount} görev`,
    previousSecondary: hasPrevious(resource) ? `${formatDurationMinutes(resource.previousPlannedMinutes)} · ${resource.previousAssignmentCount} görev` : "",
  }))
  const maxMinutes = Math.max(...data.flatMap((item) => [item.plannedMinutes, hasPrevious(item) ? item.previousPlannedMinutes : 0]))
  const maxAssignmentCount = Math.max(...data.flatMap((item) => [item.assignmentCount, hasPrevious(item) ? item.previousAssignmentCount : 0]))
  const durationScale = getNiceFleetDurationScale(maxMinutes, maxAssignmentCount)
  const axisWidth = getFleetCategoryAxisWidth(dimension)
  const resourceLabel = dimension === "vehicles" ? "Araç" : "Şoför"
  const resourcePlural = dimension === "vehicles" ? "araç" : "şoför"
  const hasHiddenResources = totalResourceCount > resources.length

  return (
    <div className="flex h-full min-h-0 flex-col">
      {(comparison || hasHiddenResources) && (
        <div className="mb-1 flex shrink-0 items-center justify-between gap-3 text-[10px] text-slate-500">
          <span>{hasHiddenResources ? `En yoğun ${resources.length} / ${totalResourceCount} ${resourcePlural} gösteriliyor` : ""}</span>
          {comparison && (
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-blue-600" />Seçili dönem</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-slate-300" />{comparisonLabel}</span>
            </span>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 2, right: 124, left: 0, bottom: 2 }} barCategoryGap="30%" barGap={3}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, durationScale.domainMax]} ticks={durationScale.ticks} tick={{ fontSize: 10 }} tickFormatter={(value) => formatDurationMinutes(Number(value))} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis dataKey="label" type="category" width={axisWidth} tick={<FleetCategoryTick />} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ fontSize: 11 }} formatter={(value, name) => [formatDurationMinutes(Number(value)), name === "previousPlannedMinutes" ? "Önceki dönem" : "Seçili dönem"]} labelFormatter={(label) => `${resourceLabel}: ${label}`} />
            {comparison && <Bar dataKey="previousPlannedMinutes" name="previousPlannedMinutes" fill="#cbd5e1" radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false} />}
            <Bar dataKey="plannedMinutes" name="plannedMinutes" fill="#2563eb" radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false}>
              <LabelList dataKey="secondary" position="right" offset={8} className="fill-slate-600" style={{ fontSize: 10 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function FleetCategoryTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const fullLabel = String(payload?.value ?? "")
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{fullLabel}</title>
      <text x={-8} dy="0.32em" textAnchor="end" fontSize={11} fill="#334155">
        {truncateFleetCategoryLabel(fullLabel)}
      </text>
    </g>
  )
}
