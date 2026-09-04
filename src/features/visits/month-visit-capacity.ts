export interface MonthVisitCapacityMeasurement {
  availableHeight: number
  visitHeight: number
  itemGap: number
  overflowHeight: number
  visitCount: number
}

/** Returns the number of full visit blocks that fit while reserving room for +N. */
export function getMonthVisibleVisitCount({ availableHeight, visitHeight, itemGap, overflowHeight, visitCount }: MonthVisitCapacityMeasurement) {
  if (visitCount === 0) return 0

  const fullVisitHeight = visitCount * visitHeight + Math.max(0, visitCount - 1) * itemGap
  if (fullVisitHeight <= availableHeight) return visitCount

  return Math.max(0, Math.min(visitCount - 1, Math.floor((availableHeight - overflowHeight) / (visitHeight + itemGap))))
}
