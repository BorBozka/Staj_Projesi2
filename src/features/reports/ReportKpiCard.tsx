export function ReportKpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-panel">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}{hint && <span className="ml-1.5 text-xs font-medium text-slate-500">{hint}</span>}</p>
    </div>
  )
}
