import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { VisitsReportDailyTrendPoint } from "@/features/reports/visits-report-utils"

export function VisitsTrendChart({ points }: { points: VisitsReportDailyTrendPoint[] }) {
  return (
    <section className="flex flex-col rounded-lg border bg-card p-3 shadow-panel" aria-label="Tarih aralığı ziyaret trendi">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Günlük Ziyaret Trendi</p>
      {points.length === 0 ? (
        <div className="flex h-24 flex-1 items-center justify-center text-xs text-slate-400">Veri yok</div>
      ) : (
        <div className="mt-1 h-24 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
              <YAxis width={32} tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ fontSize: 11 }} formatter={(value) => [value, "Ziyaret"]} />
              <Bar dataKey="count" fill="#1463eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
