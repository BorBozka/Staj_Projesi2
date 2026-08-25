export interface SortState<TField extends string> {
  field: TField
  direction: "asc" | "desc"
}

export type SingleSortState<TField extends string> = SortState<TField> | null

// Compact report tables sort one column at a time. This preserves the same three-state
// interaction used by the existing multi-column helper: ascending → descending → default.
export function toggleSingleSort<TField extends string>(current: SingleSortState<TField>, field: TField): SingleSortState<TField> {
  const next = toggleSort(current ? [current] : [], field)
  return next[0] ?? null
}

export function compareSortValues(left: string | number | null | undefined, right: string | number | null | undefined, direction: "asc" | "desc") {
  const leftEmpty = left === null || left === undefined || left === ""
  const rightEmpty = right === null || right === undefined || right === ""
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0
    // Missing values always sit after actual values, independent of the chosen direction.
    return leftEmpty ? 1 : -1
  }
  const comparison = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), "tr", { sensitivity: "base", numeric: true })
  return direction === "asc" ? comparison : -comparison
}

export function toggleSort<TField extends string>(sorts: SortState<TField>[], field: TField): SortState<TField>[] {
  const existing = sorts.find((sort) => sort.field === field)
  if (!existing) return [...sorts, { field, direction: "asc" }]
  if (existing.direction === "asc") return sorts.map((sort) => (sort.field === field ? { ...sort, direction: "desc" } : sort))
  return sorts.filter((sort) => sort.field !== field)
}
