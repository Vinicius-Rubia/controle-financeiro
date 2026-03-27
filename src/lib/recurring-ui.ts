import { formatTransactionDate } from "@/lib/transaction-ui"
import type { RecurringRule } from "@/types/recurring"

const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const

/** Rótulo curto da periodicidade + detalhe (dia do mês ou dia da semana). */
export function recurringScheduleLabel(rule: RecurringRule): string {
  if (rule.frequency === "monthly") {
    const d = rule.dayOfMonth ?? "—"
    return `Mensal · dia ${d}`
  }
  const wd = rule.weekday
  if (wd === undefined) return "Semanal"
  return `Semanal · ${WEEKDAY_LABELS[wd] ?? wd}`
}

export function weekdayLabel(index: number): string {
  if (index < 0 || index > 6) return String(index)
  return WEEKDAY_LABELS[index]
}

export function formatRecurringLastPosted(iso: string | undefined): string {
  if (!iso?.trim()) return "—"
  return formatTransactionDate(iso.slice(0, 10))
}
