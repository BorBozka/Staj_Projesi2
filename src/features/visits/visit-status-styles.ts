import type { VisitStatus } from "@/domain/visits"

export const visitStatusSurfaces: Record<VisitStatus, string> = {
  PLANNED: "border-blue-300 bg-blue-50 text-blue-800",
  CHECKED_IN: "border-emerald-300 bg-emerald-50 text-emerald-800",
  CHECKED_OUT: "border-slate-300 bg-slate-100 text-slate-800",
  CANCELLED: "border-rose-300 bg-rose-50 text-rose-800",
  NO_SHOW: "border-amber-300 bg-amber-50 text-amber-900",
}

export const visitStatusAccents: Record<VisitStatus, string> = {
  PLANNED: "border-l-blue-500",
  CHECKED_IN: "border-l-emerald-500",
  CHECKED_OUT: "border-l-slate-500",
  CANCELLED: "border-l-rose-500",
  NO_SHOW: "border-l-amber-500",
}

/** Timeline blocks outline a cancelled visit with a dashed border. */
export const visitStatusBorderStyle: Record<VisitStatus, string> = {
  PLANNED: "",
  CHECKED_IN: "",
  CHECKED_OUT: "",
  CANCELLED: "border-dashed",
  NO_SHOW: "",
}

/** Timeline blocks strike through the label text of a cancelled visit. */
export const visitStatusTextDecoration: Record<VisitStatus, string> = {
  PLANNED: "",
  CHECKED_IN: "",
  CHECKED_OUT: "",
  CANCELLED: "line-through",
  NO_SHOW: "",
}
