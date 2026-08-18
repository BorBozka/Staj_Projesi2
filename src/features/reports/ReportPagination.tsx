import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ReportPagination({ page, pageCount, visibleStart, visibleEnd, total, visiblePageNumbers, onPageChange, ariaLabel }: {
  page: number
  pageCount: number
  visibleStart: number
  visibleEnd: number
  total: number
  visiblePageNumbers: number[]
  onPageChange(page: number): void
  ariaLabel: string
}) {
  const num1 = visiblePageNumbers[0] ?? null
  const num2 = visiblePageNumbers[1] ?? null
  const num3 = visiblePageNumbers[2] ?? null

  return (
    <div className="flex flex-col gap-2 border-t bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs tabular-nums text-slate-600">{visibleStart}–{visibleEnd} / {total} kayıt</p>
      <nav className="flex items-center gap-1" aria-label={ariaLabel}>
        {page > 1 && (
          <>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(1)} title="İlk sayfa" aria-label="İlk sayfa">
              <ChevronsLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(page - 1)} title="Önceki sayfa" aria-label="Önceki sayfa">
              <ChevronLeft className="size-4" />
            </Button>
          </>
        )}
        {num1 !== null ? (
          <Button key={num1} variant={num1 === page ? "default" : "outline"} size="icon-sm" className="h-8 w-8 text-xs" aria-current={num1 === page ? "page" : undefined} aria-label={`${num1}. sayfa`} onClick={() => onPageChange(num1)}>
            {num1}
          </Button>
        ) : (
          <span key="slot-num-1" className="h-8 w-8 invisible" aria-hidden="true" />
        )}
        {num2 !== null ? (
          <Button key={num2} variant={num2 === page ? "default" : "outline"} size="icon-sm" className="h-8 w-8 text-xs" aria-current={num2 === page ? "page" : undefined} aria-label={`${num2}. sayfa`} onClick={() => onPageChange(num2)}>
            {num2}
          </Button>
        ) : (
          <span key="slot-num-2" className="h-8 w-8 invisible" aria-hidden="true" />
        )}
        {num3 !== null ? (
          <Button key={num3} variant={num3 === page ? "default" : "outline"} size="icon-sm" className="h-8 w-8 text-xs" aria-current={num3 === page ? "page" : undefined} aria-label={`${num3}. sayfa`} onClick={() => onPageChange(num3)}>
            {num3}
          </Button>
        ) : (
          <span key="slot-num-3" className="h-8 w-8 invisible" aria-hidden="true" />
        )}
        {page < pageCount ? (
          <>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(page + 1)} title="Sonraki sayfa" aria-label="Sonraki sayfa">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(pageCount)} title="Son sayfa" aria-label="Son sayfa">
              <ChevronsRight className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <span key="slot-next" className="h-8 w-8 invisible" aria-hidden="true" />
            <span key="slot-last" className="h-8 w-8 invisible" aria-hidden="true" />
          </>
        )}
      </nav>
    </div>
  )
}
