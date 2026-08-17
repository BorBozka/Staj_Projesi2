import { cn } from "@/lib/utils"

interface TransportAvailabilityPickerProps {
  title: string
  icon: React.ReactNode
  ready: boolean
  loading: boolean
  selectedId: string
  onSelect(id: string): void
  items: { id: string; title: string; detail: string }[]
}

export function TransportAvailabilityPicker({
  title,
  icon,
  ready,
  loading,
  selectedId,
  onSelect,
  items,
}: TransportAvailabilityPickerProps) {
  const emptyText = ready
    ? `Bu zaman aralığında müsait ${title === "Müsait araçlar" ? "araç" : "şoför"} yok.`
    : "Müsaitliği görmek için şirket, tesis ve tarihi seçin."

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">{icon}{title}</div>
      <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          <p className="py-2 text-xs text-slate-500">Müsaitlik hesaplanıyor…</p>
        ) : items.length === 0 ? (
          <p className="py-2 text-xs text-slate-500">{emptyText}</p>
        ) : items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
              selectedId === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-slate-900">{item.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.detail}</span>
            </span>
            <span className={cn("ml-3 shrink-0 text-[11px] font-semibold", selectedId === item.id ? "text-blue-700" : "text-slate-500")}>{selectedId === item.id ? "Seçildi" : "Seç"}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
