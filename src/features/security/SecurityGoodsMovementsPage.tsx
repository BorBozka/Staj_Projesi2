import { PackageCheck } from "lucide-react"

export function SecurityGoodsMovementsPage() {
  return (
    <section className="flex h-full min-h-0 items-center justify-center rounded-lg border bg-white shadow-panel" aria-labelledby="security-goods-heading">
      <div className="flex items-center gap-2 text-slate-700">
        <PackageCheck className="size-5 text-blue-600" aria-hidden="true" />
        <h1 id="security-goods-heading" className="text-sm font-semibold">Mal Hareketleri</h1>
      </div>
    </section>
  )
}
