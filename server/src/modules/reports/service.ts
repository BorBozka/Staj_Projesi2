import { ApiError } from "../../lib/api-error.js"
import type { DateRangeFilter, InstantRangeFilter, ReportsRepository } from "../../repositories/reports-repository.js"
import type { FleetReportDataset, GoodsReportDataset, ReportsQuery, VisitsReportDataset } from "./types.js"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Serves raw record datasets for the Manager Reports screen. Date-range semantics mirror the
 * frontend `reports-filters` / report utils: the range is inclusive local-day boundaries
 * (`startOfDay(start) .. endOfDay(end)`) on the record's planned instant, an inverted range
 * yields an empty dataset, and an open bound simply drops that side of the filter.
 */
export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

  async getVisitsReport(query: ReportsQuery): Promise<VisitsReportDataset> {
    if (this.rangeInverted(query)) return { visits: [] }
    return { visits: await this.repository.listVisits(this.instantFilter(query)) }
  }

  async getFleetReport(query: ReportsQuery): Promise<FleetReportDataset> {
    if (this.rangeInverted(query)) return { assignments: [] }
    return { assignments: await this.repository.listFleet(this.instantFilter(query)) }
  }

  async getGoodsReport(query: ReportsQuery): Promise<GoodsReportDataset> {
    if (this.rangeInverted(query)) return { movements: [] }
    return { movements: await this.repository.listGoods(this.dateFilter(query)) }
  }

  private rangeInverted(query: ReportsQuery): boolean {
    const start = this.parseDate(query.startDate)
    const end = this.parseDate(query.endDate)
    return Boolean(start && end && start > end)
  }

  private parseDate(value: string | undefined): string | undefined {
    if (value === undefined || value === "") return undefined
    if (!DATE_PATTERN.test(value) || Number.isNaN(new Date(`${value}T12:00:00`).getTime())) {
      throw new ApiError(400, "VALIDATION_ERROR", "Geçersiz rapor tarih aralığı.")
    }
    return value
  }

  private normalizeId(value: string | undefined): string | undefined {
    return !value || value === "all" ? undefined : value
  }

  private instantFilter(query: ReportsQuery): InstantRangeFilter {
    const start = this.parseDate(query.startDate)
    const end = this.parseDate(query.endDate)
    return {
      companyId: this.normalizeId(query.companyId),
      facilityId: this.normalizeId(query.facilityId),
      from: start ? startOfLocalDay(start) : undefined,
      to: end ? endOfLocalDay(end) : undefined,
    }
  }

  private dateFilter(query: ReportsQuery): DateRangeFilter {
    return {
      companyId: this.normalizeId(query.companyId),
      facilityId: this.normalizeId(query.facilityId),
      startDate: this.parseDate(query.startDate),
      endDate: this.parseDate(query.endDate),
    }
  }
}

function startOfLocalDay(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function endOfLocalDay(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day, 23, 59, 59, 999)
}
