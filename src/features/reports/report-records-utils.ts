import { compareSortValues, type SingleSortState } from "@/lib/sort"

export function normalizeReportSearch(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR")
}

export function matchesReportSearch(value: string, fields: Array<string | null | undefined>) {
  const query = normalizeReportSearch(value)
  if (!query) return true
  return fields.some((field) => (field ?? "").toLocaleLowerCase("tr-TR").includes(query))
}

export function sortReportRecords<T, TField extends string>(items: T[], sort: SingleSortState<TField>, getValue: (item: T, field: TField) => string | number | null | undefined) {
  if (!sort) return items
  return items.map((item, index) => ({ item, index })).sort((left, right) => {
    const comparison = compareSortValues(getValue(left.item, sort.field), getValue(right.item, sort.field), sort.direction)
    return comparison || left.index - right.index
  }).map(({ item }) => item)
}
