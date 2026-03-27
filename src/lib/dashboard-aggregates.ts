import { transactionAffectsCashBalance } from "@/lib/account-ui"
import {
  dueDateForStatementClosing,
  statementSummariesForCard,
  totalCreditOutstanding,
} from "@/lib/credit-statement"
import type { Card } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { RecurringRule } from "@/types/recurring"
import type { Transaction } from "@/types/transaction"

export interface DashboardTotals {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
  categoriesUsedCount: number
}

export type DashboardScope = "all" | "cash"

function aggregateTotalsForTransactions(
  transactions: Transaction[]
): DashboardTotals {
  let totalIncome = 0
  let totalExpense = 0
  const categoryIds = new Set<string>()

  for (const t of transactions) {
    if (t.type === "income") totalIncome += t.amount
    else totalExpense += t.amount
    if (t.categoryId) categoryIds.add(t.categoryId)
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: transactions.length,
    categoriesUsedCount: categoryIds.size,
  }
}

export function computeDashboardTotalsScoped(
  transactions: Transaction[],
  scope: DashboardScope
): DashboardTotals {
  const slice =
    scope === "cash"
      ? transactions.filter(transactionAffectsCashBalance)
      : transactions
  return aggregateTotalsForTransactions(slice)
}

export function computeDashboardTotals(
  transactions: Transaction[]
): DashboardTotals {
  return aggregateTotalsForTransactions(transactions)
}

/** Soma da dívida em aberto no crédito (todos os cartões). */
export function totalCreditDebtAllCards(
  cards: Card[],
  transactions: Transaction[]
): number {
  let sum = 0
  for (const c of cards) {
    if (!c.active) continue
    sum += totalCreditOutstanding(transactions, c)
  }
  return sum
}

export interface MonthlyFlowRow {
  period: string
  label: string
  income: number
  expense: number
}

function monthKeyFromIso(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** Inclusive range of YYYY-MM keys from `from` through `to`. */
function enumerateMonthKeys(from: string, to: string): string[] {
  const toIndex = (k: string) => {
    const [y, m] = k.split("-").map(Number)
    return y * 12 + (m - 1)
  }
  const a = toIndex(from)
  const b = toIndex(to)
  const out: string[] = []
  for (let i = a; i <= b; i++) {
    const y = Math.floor(i / 12)
    const m = (i % 12) + 1
    out.push(`${y}-${String(m).padStart(2, "0")}`)
  }
  return out
}

function formatMonthLabel(period: string): string {
  const [year, month] = period.split("-").map(Number)
  const d = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(d)
}

export function computeMonthlyFlow(
  transactions: Transaction[]
): MonthlyFlowRow[] {
  const byMonth = new Map<string, { income: number; expense: number }>()

  for (const t of transactions) {
    const key = monthKeyFromIso(t.date)
    if (!key) continue
    const cur = byMonth.get(key) ?? { income: 0, expense: 0 }
    if (t.type === "income") cur.income += t.amount
    else cur.expense += t.amount
    byMonth.set(key, cur)
  }

  const keys = [...byMonth.keys()].sort()
  if (keys.length === 0) return []

  const allKeys = enumerateMonthKeys(keys[0], keys[keys.length - 1])

  return allKeys.map((period) => {
    const v = byMonth.get(period) ?? { income: 0, expense: 0 }
    return {
      period,
      label: formatMonthLabel(period),
      income: v.income,
      expense: v.expense,
    }
  })
}

export type DistributionMode = "expense" | "income"

export interface CategorySliceRow {
  key: string
  name: string
  value: number
}

export function resolveDistributionMode(
  transactions: Transaction[]
): DistributionMode {
  let expenseSum = 0
  for (const t of transactions) {
    if (t.type === "expense") expenseSum += t.amount
  }
  if (expenseSum > 0) return "expense"
  return "income"
}

export function computeCategorySlices(
  transactions: Transaction[],
  categoryNameById: Map<string, string>,
  mode: DistributionMode,
  maxVisible = 5
): CategorySliceRow[] {
  const sums = new Map<string, number>()
  for (const t of transactions) {
    if (mode === "expense" && t.type !== "expense") continue
    if (mode === "income" && t.type !== "income") continue
    if (!t.categoryId) continue
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount)
  }

  const rows: CategorySliceRow[] = [...sums.entries()]
    .filter(([, value]) => value > 0)
    .map(([id, value]) => ({
      key: `cat_${id}`,
      name: categoryNameById.get(id) ?? "Categoria removida",
      value,
    }))
    .sort((a, b) => b.value - a.value)

  if (rows.length <= maxVisible) return rows

  const top = rows.slice(0, maxVisible)
  const restSum = rows
    .slice(maxVisible)
    .reduce((acc, r) => acc + r.value, 0)
  if (restSum > 0) {
    top.push({ key: "other", name: "Outras", value: restSum })
  }
  return top
}

export interface UpcomingPendingRow {
  key: string
  date: string
  title: string
  type: "income" | "expense"
  amount: number
  source: "transaction" | "credit_statement" | "installment" | "recurring"
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  next.setDate(next.getDate() + days)
  return next
}

function inRangeInclusive(iso: string, fromIso: string, toIso: string): boolean {
  return iso >= fromIso && iso <= toIso
}

function normalizeDateOnly(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function statementDueDateForCardPurchase(isoDate: string, card: Card): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  if (!y || !m || !d) return isoDate
  const closeDayCurrentMonth = Math.min(
    card.closingDay,
    new Date(y, m, 0).getDate()
  )
  let closeYear = y
  let closeMonth = m
  if (d > closeDayCurrentMonth) {
    closeMonth += 1
    if (closeMonth > 12) {
      closeMonth = 1
      closeYear += 1
    }
  }
  const closeDay = Math.min(
    card.closingDay,
    new Date(closeYear, closeMonth, 0).getDate()
  )
  const closingIso = `${closeYear}-${pad2(closeMonth)}-${pad2(closeDay)}`
  return dueDateForStatementClosing(closingIso, card.dueDay)
}

function pushOrAccumulate(
  rowsByKey: Map<string, UpcomingPendingRow>,
  row: UpcomingPendingRow
) {
  const existing = rowsByKey.get(row.key)
  if (!existing) {
    rowsByKey.set(row.key, row)
    return
  }
  existing.amount += row.amount
}

function recurringDatesInRange(
  rule: RecurringRule,
  from: Date,
  to: Date
): string[] {
  const dates: string[] = []
  for (
    let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    cursor <= to;
    cursor = addDays(cursor, 1)
  ) {
    if (rule.frequency === "monthly") {
      if (rule.dayOfMonth === undefined) continue
      const day = Math.min(
        rule.dayOfMonth,
        new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
      )
      if (cursor.getDate() === day) dates.push(toISODate(cursor))
      continue
    }
    if (rule.weekday === undefined) continue
    if (cursor.getDay() === rule.weekday) dates.push(toISODate(cursor))
  }
  return dates
}

function parseIsoDateOnly(value: string | undefined): Date | null {
  if (!value?.trim()) return null
  const iso = value.includes("T") ? value.slice(0, 10) : value
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function weekStartSunday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - d.getDay())
  return d
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function sameWeekSundayStart(a: Date, b: Date): boolean {
  const wa = weekStartSunday(a)
  const wb = weekStartSunday(b)
  return (
    wa.getFullYear() === wb.getFullYear() &&
    wa.getMonth() === wb.getMonth() &&
    wa.getDate() === wb.getDate()
  )
}

function previousMonthlyOccurrenceDate(
  occurrence: Date,
  dayOfMonth: number | undefined
): Date {
  const targetDay = dayOfMonth ?? occurrence.getDate()
  let y = occurrence.getFullYear()
  let m0 = occurrence.getMonth() - 1
  if (m0 < 0) {
    m0 = 11
    y -= 1
  }
  const lastDay = new Date(y, m0 + 1, 0).getDate()
  return new Date(y, m0, Math.min(targetDay, lastDay))
}

function launchedWithinOccurrenceCycle(
  launchedAt: Date,
  previousOccurrence: Date,
  occurrence: Date
): boolean {
  const launchTs = launchedAt.getTime()
  return launchTs > previousOccurrence.getTime() && launchTs <= occurrence.getTime()
}

function recurringOccurrenceAlreadyLaunched(
  rule: RecurringRule,
  occurrenceDateIso: string
): boolean {
  const lastPosted = parseIsoDateOnly(rule.lastPostedAt)
  if (!lastPosted) return false
  const occurrence = parseIsoDateOnly(occurrenceDateIso)
  if (!occurrence) return false
  if (rule.frequency === "monthly") {
    const prev = previousMonthlyOccurrenceDate(occurrence, rule.dayOfMonth)
    return launchedWithinOccurrenceCycle(lastPosted, prev, occurrence)
  }
  const prev = addDays(occurrence, -7)
  return launchedWithinOccurrenceCycle(lastPosted, prev, occurrence)
}

export function computeUpcomingPendenciesNext7Days(
  transactions: Transaction[],
  cards: Card[],
  installmentPlans: InstallmentPlan[],
  recurringRules: RecurringRule[],
  today = new Date()
): UpcomingPendingRow[] {
  const from = normalizeDateOnly(today)
  const to = addDays(from, 6)
  const fromIso = toISODate(from)
  const toIso = toISODate(to)
  const cardById = new Map(cards.map((c) => [c.id, c]))

  const rowsByKey = new Map<string, UpcomingPendingRow>()

  for (const card of cards) {
    const summaries = statementSummariesForCard(transactions, card)
    for (const summary of summaries) {
      if (summary.outstanding <= 0) continue
      if (!inRangeInclusive(summary.dueDateIso, fromIso, toIso)) continue
      const key = `stmt:${card.id}:${summary.dueDateIso}`
      pushOrAccumulate(rowsByKey, {
        key,
        date: summary.dueDateIso,
        title: `Fatura ${card.name}`,
        type: "expense",
        amount: summary.outstanding,
        source: "credit_statement",
      })
    }
  }

  for (const plan of installmentPlans) {
    if (plan.status !== "active") continue
    for (const installment of plan.installments) {
      if (installment.status !== "reserved") continue
      if (plan.paymentMethod === "credit_card" && plan.cardId) {
        const card = cardById.get(plan.cardId)
        if (!card) continue
        const dueDateIso = statementDueDateForCardPurchase(installment.dueDate, card)
        if (!inRangeInclusive(dueDateIso, fromIso, toIso)) continue
        const key = `plan-card:${plan.id}:${card.id}:${dueDateIso}:${plan.type}`
        pushOrAccumulate(rowsByKey, {
          key,
          date: dueDateIso,
          title: `Fatura ${card.name} · ${plan.title}`,
          type: plan.type,
          amount: installment.amount,
          source: "installment",
        })
      } else {
        if (!inRangeInclusive(installment.dueDate, fromIso, toIso)) continue
        const key = `plan:${plan.id}:${installment.id}`
        rowsByKey.set(key, {
          key,
          date: installment.dueDate,
          title: `${plan.title} (${installment.number}/${plan.installmentCount})`,
          type: plan.type,
          amount: installment.amount,
          source: "installment",
        })
      }
    }
  }

  for (const rule of recurringRules) {
    if (!rule.active) continue
    const occurrenceDates = recurringDatesInRange(rule, from, to)
    for (const occurrenceDate of occurrenceDates) {
      if (recurringOccurrenceAlreadyLaunched(rule, occurrenceDate)) continue
      if (rule.paymentMethod === "credit_card" && rule.cardId) {
        const card = cardById.get(rule.cardId)
        if (!card) continue
        const dueDateIso = statementDueDateForCardPurchase(occurrenceDate, card)
        if (!inRangeInclusive(dueDateIso, fromIso, toIso)) continue
        const key = `rec-card:${rule.id}:${card.id}:${dueDateIso}:${rule.type}`
        pushOrAccumulate(rowsByKey, {
          key,
          date: dueDateIso,
          title: `Fatura ${card.name} · ${rule.title}`,
          type: rule.type,
          amount: rule.amount,
          source: "recurring",
        })
      } else {
        const key = `rec:${rule.id}:${occurrenceDate}`
        rowsByKey.set(key, {
          key,
          date: occurrenceDate,
          title: rule.title,
          type: rule.type,
          amount: rule.amount,
          source: "recurring",
        })
      }
    }
  }

  return [...rowsByKey.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    return a.title.localeCompare(b.title)
  })
}
