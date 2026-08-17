export interface SortState<TField extends string> {
  field: TField
  direction: "asc" | "desc"
}

export function toggleSort<TField extends string>(sorts: SortState<TField>[], field: TField): SortState<TField>[] {
  const existing = sorts.find((sort) => sort.field === field)
  if (!existing) return [...sorts, { field, direction: "asc" }]
  if (existing.direction === "asc") return sorts.map((sort) => (sort.field === field ? { ...sort, direction: "desc" } : sort))
  return sorts.filter((sort) => sort.field !== field)
}
