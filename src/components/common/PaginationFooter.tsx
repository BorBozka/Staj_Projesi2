import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface PaginationFooterProps {
  page: number
  pageCount: number
  visibleStart: number
  visibleEnd: number
  total: number
  visiblePageNumbers: number[]
  onPageChange(page: number): void
  ariaLabel: string
}

export function PaginationFooter({ page, pageCount, visibleStart, visibleEnd, total, visiblePageNumbers, onPageChange, ariaLabel }: PaginationFooterProps) {
  return (
    <div className="flex min-h-[3.75rem] flex-col gap-2 border-t bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs tabular-nums text-slate-600">{visibleStart}–{visibleEnd} / {total} kayıt</p>
      {pageCount > 1 && <nav className="flex items-center gap-1" aria-label={ariaLabel}>
        <span className="flex w-[68px] shrink-0 justify-end gap-1">
          {page > 1 && <>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(1)} title="İlk sayfa" aria-label="İlk sayfa"><ChevronsLeft className="size-4" /></Button>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(page - 1)} title="Önceki sayfa" aria-label="Önceki sayfa"><ChevronLeft className="size-4" /></Button>
          </>}
        </span>
        {visiblePageNumbers.map((pageNumber) => (
          <Button key={pageNumber} variant={pageNumber === page ? "default" : "outline"} size="icon-sm" className="h-8 w-8 text-xs" aria-current={pageNumber === page ? "page" : undefined} aria-label={`${pageNumber}. sayfa`} onClick={() => onPageChange(pageNumber)}>{pageNumber}</Button>
        ))}
        <span className="flex w-[68px] shrink-0 gap-1">
          {page < pageCount && <>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(page + 1)} title="Sonraki sayfa" aria-label="Sonraki sayfa"><ChevronRight className="size-4" /></Button>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => onPageChange(pageCount)} title="Son sayfa" aria-label="Son sayfa"><ChevronsRight className="size-4" /></Button>
          </>}
        </span>
      </nav>}
    </div>
  )
}
