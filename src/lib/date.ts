import { format } from "date-fns"
import { tr } from "date-fns/locale"

export function formatTr(date: Date, pattern: string) {
  return format(date, pattern, { locale: tr })
}
