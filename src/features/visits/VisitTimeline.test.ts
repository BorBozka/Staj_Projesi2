import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const timelineSource = readFileSync(resolve(process.cwd(), "src/features/visits/VisitTimeline.tsx"), "utf8")
const dialogSource = readFileSync(resolve(process.cwd(), "src/components/ui/dialog.tsx"), "utf8")
const statusStylesSource = readFileSync(resolve(process.cwd(), "src/features/visits/visit-status-styles.ts"), "utf8")

function componentSource(name: string, nextName: string) {
  return timelineSource.slice(timelineSource.indexOf(`function ${name}`), timelineSource.indexOf(`function ${nextName}`))
}

const statusPanelSource = timelineSource.slice(
  timelineSource.indexOf('<DropdownMenuContent align="end" className="w-48 p-2">'),
  timelineSource.indexOf("</DropdownMenuContent>"),
)

describe("VisitTimeline planned-time rendering", () => {
  it("uses the Istanbul instant formatter for daily labels and weekly hover detail", () => {
    expect(componentSource("DayVisitCard", "VisitBlock")).toContain("formatIstanbulWallClockTime(visit.plannedStart)")
    expect(componentSource("VisitHoverTooltip", "MonthTimeline")).toContain("formatIstanbulWallClockTime(visit.plannedStart)")
  })

  it("keeps the month block label on its existing Date-based display path", () => {
    const monthSource = componentSource("MonthTimeline", "MonthOverflowMenu")
    expect(monthSource).toContain('formatTr(new Date(visit.plannedStart), "HH:mm")')
  })
})

describe("VisitTimeline cancelled-visit counting", () => {
  it("uses the Upcoming Visits cancellation source for the toolbar count in every view", () => {
    expect(timelineSource).toContain('import { getNonCancelledUpcomingVisits } from "@/features/visits/upcoming-visits"')
    expect(timelineSource).toContain("const countedVisits = getNonCancelledUpcomingVisits(visibleVisits)")
    expect(timelineSource).toContain("{countedVisits.length} ziyaret")
    expect(timelineSource).not.toContain("{visibleVisits.length} ziyaret")
  })

  it("keeps cancelled visits in both the lane and month block inputs", () => {
    expect(timelineSource).toContain("<MonthTimeline visits={visits}")
    expect(timelineSource).toContain("visits={visibleVisits}")
    expect(statusStylesSource).toMatch(/visitStatusBorderStyle[\s\S]*CANCELLED: "border-dashed"/)
    expect(statusStylesSource).toMatch(/visitStatusTextDecoration[\s\S]*CANCELLED: "line-through"/)
  })
})

describe("VisitTimeline weekly block and current-time ruler", () => {
  it("shows only the visitor name, centered when it does not fill the weekly block, while retaining the dark hover tooltip", () => {
    const weekBlockSource = componentSource("VisitBlock", "WeekCurrentTimeIndicator")
    const hoverSource = componentSource("VisitHoverTooltip", "MonthTimeline")

    expect(weekBlockSource).toContain("{visit.visitor.firstName} {visit.visitor.lastName}")
    expect(weekBlockSource).toContain("fullLabel.getBoundingClientRect().width <= content.clientWidth")
    expect(weekBlockSource).toContain('hasExtraSpace && "text-center"')
    expect(weekBlockSource).toContain("flex items-center")
    expect(weekBlockSource).toContain("new ResizeObserver(updateExtraSpace)")
    expect(weekBlockSource).not.toContain("visitTypeName")
    expect(weekBlockSource).toContain("<VisitHoverTooltip visit={visit} />")
    expect(weekBlockSource).toContain('title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}')
    expect(weekBlockSource).not.toContain("{startLabel}–{endLabel}</span>")
    expect(weekBlockSource).not.toContain(" · {visit.facilityName}")
    expect(hoverSource).toContain('bg-slate-950')
    expect(hoverSource).toContain("{visit.visitTypeName}")
    expect(hoverSource).toContain("formatIstanbulWallClockTime(visit.plannedStart)")
  })

  it("keeps day card time labels and separates the weekly now badge from every ruler label", () => {
    const dayCardSource = componentSource("DayVisitCard", "VisitBlock")
    const headerSource = componentSource("TimeHeader", "TimeAxis")
    const axisSource = timelineSource.slice(timelineSource.indexOf("function TimeAxis"), timelineSource.indexOf("interface DayVisitLayout"))

    expect(dayCardSource).toContain("{startLabel}–{endLabel}")
    expect(headerSource).toContain('className="relative h-10"')
    expect(axisSource).toContain('className="absolute inset-x-0 bottom-0 h-7"')
    expect(headerSource).not.toContain("hiddenHour")
    expect(headerSource).not.toContain("ResizeObserver")
    expect(axisSource).not.toContain("invisible")
    expect(headerSource).toContain("<WeekCurrentTimeMarker left={nowOffset} />")
  })

  it("uses the full day-placement height without a fixed subtraction", () => {
    const dayCardSource = componentSource("DayVisitCard", "VisitBlock")

    expect(dayCardSource).toContain("getDayVisitPlacement(startMinutes, endMinutes, timeRange)")
    expect(dayCardSource).toContain("height: `${height}%`")
    expect(dayCardSource).not.toContain("height: `calc(${height}% - 2px)`")
  })

  it("contains day-card content and keeps the weekly block title to the full visitor name", () => {
    const dayCardSource = componentSource("DayVisitCard", "VisitBlock")
    const weekBlockSource = componentSource("VisitBlock", "WeekCurrentTimeIndicator")

    expect(dayCardSource).toContain('"absolute inset-0 w-full overflow-hidden rounded border')
    expect(dayCardSource).not.toContain("title=")
    expect(weekBlockSource).toContain('title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}')
    expect(weekBlockSource).toContain("<VisitHoverTooltip visit={visit} />")
  })

  it("removes the daily custom tooltip while retaining height-based content lines", () => {
    const dayCardSource = componentSource("DayVisitCard", "VisitBlock")

    expect(dayCardSource).not.toContain("DayVisitHoverTooltip")
    expect(dayCardSource).not.toContain("title=")
    expect(dayCardSource).toContain("getDayVisitContentLineCount(content.clientHeight)")
    expect(dayCardSource).toContain("lineCount >= 2")
    expect(dayCardSource).toContain("lineCount >= 3")
    expect(dayCardSource).toContain("lineCount >= 4")
    expect(dayCardSource).toContain("visit.visitor.company")
  })

  it("keeps every daily text line visible by placing the now badge in its own rail band", () => {
    const dayMarkerSource = componentSource("DayCurrentTimeIndicator", "DayCurrentTimeMarker")
    const dayBadgeSource = componentSource("DayCurrentTimeMarker", "MonthTimeline")
    const dayCardSource = componentSource("DayVisitCard", "VisitBlock")

    expect(dayMarkerSource).toContain('className="pointer-events-none absolute inset-x-0 z-0')
    expect(dayBadgeSource).toContain('className="pointer-events-none absolute left-0 z-30')
    expect(timelineSource).toContain('grid-cols-[34px_52px_minmax(0,1fr)]')
    expect(timelineSource).toContain("<DayCurrentTimeMarker now={now} timeRange={timeRange} />")
    expect(dayCardSource).not.toContain("invisible")
    expect(dayCardSource).not.toContain("obscuredLineKeys")
  })

  it("does not redraw the first/last day-agenda hour rule already drawn by the surrounding borders", () => {
    const laneSource = componentSource("LaneTimeline", "TimeHeader")
    expect(laneSource).toContain("index === 0 || index === hours.length - 1 ? null : (")
  })

  it("keeps the employee-sized week grid from becoming internally scrollable", () => {
    const laneSource = componentSource("LaneTimeline", "TimeHeader")

    expect(laneSource).toContain('fitToHeight ? "overflow-hidden" : "overflow-y-auto"')
  })
})

describe("VisitTimeline status-indicator panel", () => {
  it("lists all five statuses in the fixed order with their unchanged labels", () => {
    expect(statusPanelSource).toContain('["PLANNED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const')
    expect(statusPanelSource).toContain("{visitStatusLabels[status]}")
  })

  it("derives every sample style from the shared status→style maps, not hand-copied colours", () => {
    expect(statusPanelSource).toContain("visitStatusSurfaces[status]")
    expect(statusPanelSource).toContain("visitStatusAccents[status]")
    expect(statusPanelSource).toContain("visitStatusBorderStyle[status]")
    expect(statusPanelSource).toContain("visitStatusTextDecoration[status]")
    for (const literal of ["bg-blue-50", "bg-emerald-50", "border-rose-300", "border-l-emerald-500", "border-l-rose-500"]) {
      expect(statusPanelSource).not.toContain(literal)
    }
  })

  it("represents the cancelled visit with the same dashed border and strike-through the blocks use", () => {
    expect(statusStylesSource).toMatch(/visitStatusBorderStyle[\s\S]*CANCELLED: "border-dashed"/)
    expect(statusStylesSource).toMatch(/visitStatusTextDecoration[\s\S]*CANCELLED: "line-through"/)
  })

  it("renders the samples as inert legend swatches, not buttons or menu items", () => {
    expect(statusPanelSource).not.toContain("<button")
    expect(statusPanelSource).not.toContain("onClick")
    expect(statusPanelSource).not.toContain('role="button"')
    expect(statusPanelSource).not.toContain("DropdownMenuItem")
    expect(statusPanelSource).not.toContain("VisitStatusBadge")
    expect(statusPanelSource).toContain('aria-hidden="true"')
  })

  it("has the timeline blocks read the same maps so the panel cannot silently diverge", () => {
    const weekBlockSource = componentSource("VisitBlock", "WeekCurrentTimeIndicator")
    expect(weekBlockSource).toContain("visitStatusBorderStyle[visit.status]")
    expect(weekBlockSource).toContain("visitStatusTextDecoration[visit.status]")
    expect(weekBlockSource).not.toContain('visit.status === "CANCELLED" && "border-dashed"')
    expect(timelineSource).not.toContain('visit.status === "CANCELLED" && "line-through"')
  })
})

describe("VisitTimeline layering", () => {
  it("keeps the now line behind visit cards and its badge above them", () => {
    const dayMarkerSource = componentSource("DayCurrentTimeIndicator", "DayCurrentTimeMarker")
    const dayBadgeSource = componentSource("DayCurrentTimeMarker", "MonthTimeline")
    const weekIndicatorSource = componentSource("WeekCurrentTimeIndicator", "WeekCurrentTimeMarker")
    const dayCardSource = componentSource("DayVisitCard", "VisitBlock")

    expect(dayCardSource).toContain('className="group absolute z-[1]')
    expect(dayMarkerSource).toContain('className="pointer-events-none absolute inset-x-0 z-0')
    expect(dayBadgeSource).toContain('className="pointer-events-none absolute left-0 z-30')
    expect(weekIndicatorSource).toContain('z-0 w-px bg-rose-500/80')
    expect(dialogSource).toContain('z-50 grid')
  })
})

describe("VisitTimeline month blocks", () => {
  it("keeps every month week row at the same fixed grid height", () => {
    const monthSource = componentSource("MonthTimeline", "MonthDayCell")

    expect(monthSource).toContain('className="flex h-full min-w-[760px] flex-col"')
    expect(monthSource).toContain("minmax(0, 1fr)")
    expect(monthSource).not.toContain("minmax(min-content, 1fr)")
  })

  it("measures fixed cell content and puts every non-fitting visit behind the overflow control", () => {
    const monthCellSource = componentSource("MonthDayCell", "MonthVisitBlock")
    const overflowSource = componentSource("MonthOverflowMenu", "EmptyTimelineOverlay")

    expect(monthCellSource).toContain("getMonthVisibleVisitCount({")
    expect(monthCellSource).toContain("cell.clientHeight")
    expect(monthCellSource).toContain("dayNumber.getBoundingClientRect().height")
    expect(monthCellSource).toContain("visitRect.height")
    expect(monthCellSource).toContain("overflowHeight: overflowRect.height")
    expect(monthCellSource).toContain("const hiddenVisits = visits.slice(visibleVisitCount)")
    expect(monthCellSource).toContain("{hiddenVisits.length > 0 && <MonthOverflowMenu")
    expect(monthCellSource).toContain('"relative min-h-0 overflow-hidden border-b border-r')
    expect(overflowSource).toContain("+{visits.length} ziyaret")
    expect(overflowSource).toContain("onSelect={() => onVisitOpen(visit)}")
  })

  it("uses the weekly block interaction source for monthly blocks, the overflow control, and its rows", () => {
    const weekBlockSource = componentSource("VisitBlock", "WeekCurrentTimeIndicator")
    const monthBlockSource = componentSource("MonthVisitBlock", "MonthOverflowMenu")
    const overflowSource = componentSource("MonthOverflowMenu", "EmptyTimelineOverlay")

    expect(weekBlockSource).toContain("visitBlockInteractionClass")
    expect(monthBlockSource).toContain("visitBlockInteractionClass")
    expect(overflowSource).toContain("visitBlockInteractionClass")
  })

  it("uses the dark portal tooltip for month blocks without restoring a native title", () => {
    const monthBlockSource = componentSource("MonthVisitBlock", "MonthVisitHoverTooltip")
    const monthTooltipSource = componentSource("MonthVisitHoverTooltip", "MonthOverflowMenu")

    expect(monthBlockSource).toContain("<MonthVisitHoverTooltip")
    expect(monthBlockSource).toContain("onPointerEnter")
    expect(monthBlockSource).not.toContain("title=")
    expect(monthTooltipSource).toContain("createPortal")
    expect(monthTooltipSource).toContain('role="tooltip"')
    expect(monthTooltipSource).toContain("bg-slate-950")
    expect(monthTooltipSource).toContain("<VisitTooltipContent visit={visit} />")
  })

  it("keeps the weekly dark hover tooltip with the visitor company and a full-name title", () => {
    const weekBlockSource = componentSource("VisitBlock", "WeekCurrentTimeIndicator")
    const hoverSource = componentSource("VisitHoverTooltip", "MonthTimeline")

    expect(weekBlockSource).toContain('title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}')
    expect(hoverSource).toContain('role="tooltip"')
    expect(hoverSource).toContain("visit.visitor.company")
  })
})
