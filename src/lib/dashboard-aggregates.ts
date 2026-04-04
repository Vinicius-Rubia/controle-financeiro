import { transactionAffectsCashBalance } from "@/lib/account-ui"
import {
  dueDateForStatementClosing,
  statementSummariesForCard,
  totalCreditOutstanding,
} from "@/lib/credit-statement"
import type { Card } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { PlannedPayment } from "@/types/planned-payment"
import type { RecurringRule } from "@/types/recurring"
import type { PaymentMethod, Transaction } from "@/types/transaction"

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
    /**
     * Conta como “já lançado” para esta ocorrência só se o último lançamento
     * caiu no mesmo mês civil da data da ocorrência (ex.: ocorrência 15/04 só
     * some se houve lançamento em abril). Evita que um pagamento atrasado no
     * fim do mês anterior (ex. 31/03) encerre o ciclo do mês seguinte (15/04).
     */
    return (
      lastPosted.getFullYear() === occurrence.getFullYear() &&
      lastPosted.getMonth() === occurrence.getMonth()
    )
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

export type MonthlyProjectionSource =
  | "recurring"
  | "installment"
  | "credit_statement"
  | "planned_payment"

export interface MonthlyProjectionItem {
  key: string
  /** Data em que o efeito no caixa ou o vencimento da fatura ocorre (`YYYY-MM-DD`). */
  dueDateIso: string
  title: string
  subtitle?: string
  type: "income" | "expense"
  amount: number
  amountIsKnown: boolean
  source: MonthlyProjectionSource
  categoryId?: string
  accountId?: string
  cardId?: string
  /** Conta usada para pagar fatura (quando aplicável). */
  payFromAccountId?: string
  paymentMethod?: PaymentMethod
  statementClosingIso?: string
  /** Data de competência no crédito (parcela / uso) quando o pagamento é na fatura. */
  competenceIso?: string
  installmentNumber?: number
  installmentCount?: number
}

/**
 * Itens previstos de entrada e saída para um mês civil: faturas em aberto com
 * vencimento no mês, parcelas reservadas, recorrências ainda não lançadas e
 * planejamentos do período.
 */
export function computeMonthlyProjection(input: {
  year: number
  month: number
  transactions: Transaction[]
  cards: Card[]
  installmentPlans: InstallmentPlan[]
  recurringRules: RecurringRule[]
  plannedPayments: PlannedPayment[]
}): MonthlyProjectionItem[] {
  const {
    year,
    month,
    transactions,
    cards,
    installmentPlans,
    recurringRules,
    plannedPayments,
  } = input

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  const fromIso = toISODate(monthStart)
  const toIso = toISODate(monthEnd)
  const cardById = new Map(cards.map((c) => [c.id, c]))

  const inSelectedMonth = (iso: string) => inRangeInclusive(iso, fromIso, toIso)

  const rows: MonthlyProjectionItem[] = []

  for (const card of cards) {
    if (!card.active) continue
    const summaries = statementSummariesForCard(transactions, card)
    for (const summary of summaries) {
      if (summary.outstanding <= 0) continue
      if (!inSelectedMonth(summary.dueDateIso)) continue
      rows.push({
        key: `stmt:${card.id}:${summary.closingDateIso}`,
        dueDateIso: summary.dueDateIso,
        title: `Fatura — ${card.name}`,
        type: "expense",
        amount: summary.outstanding,
        amountIsKnown: true,
        source: "credit_statement",
        payFromAccountId: card.accountId,
        accountId: card.accountId,
        cardId: card.id,
        statementClosingIso: summary.closingDateIso,
        paymentMethod: "credit_card_settlement",
      })
    }
  }

  for (const plan of installmentPlans) {
    if (plan.status !== "active") continue
    for (const inst of plan.installments) {
      if (inst.status !== "reserved") continue
      let dueDateIso: string
      let competenceIso: string | undefined
      if (plan.paymentMethod === "credit_card" && plan.cardId) {
        const card = cardById.get(plan.cardId)
        if (!card || !card.active) continue
        dueDateIso = statementDueDateForCardPurchase(inst.dueDate, card)
        competenceIso = inst.dueDate
      } else {
        dueDateIso = inst.dueDate
      }
      // No crédito, o pagamento na fatura (dueDateIso) pode cair no mês seguinte;
      // o mês da lista segue o vencimento da parcela cadastrado.
      const inMonth =
        plan.paymentMethod === "credit_card" && plan.cardId
          ? inSelectedMonth(inst.dueDate)
          : inSelectedMonth(dueDateIso)
      if (!inMonth) continue
      rows.push({
        key: `inst:${plan.id}:${inst.id}`,
        dueDateIso,
        title: plan.title,
        subtitle: `Parcela ${inst.number}/${plan.installmentCount}`,
        type: plan.type,
        amount: inst.amount,
        amountIsKnown: true,
        source: "installment",
        categoryId: plan.categoryId,
        accountId: plan.accountId,
        cardId: plan.cardId,
        paymentMethod: plan.paymentMethod,
        competenceIso,
        installmentNumber: inst.number,
        installmentCount: plan.installmentCount,
      })
    }
  }

  for (const rule of recurringRules) {
    if (!rule.active) continue
    const occurrenceDates = recurringDatesInRange(rule, monthStart, monthEnd)
    for (const occurrenceDate of occurrenceDates) {
      if (recurringOccurrenceAlreadyLaunched(rule, occurrenceDate)) continue
      let dueDateIso: string
      let competenceIso: string | undefined
      if (rule.paymentMethod === "credit_card" && rule.cardId) {
        const card = cardById.get(rule.cardId)
        if (!card || !card.active) continue
        dueDateIso = statementDueDateForCardPurchase(occurrenceDate, card)
        competenceIso = occurrenceDate
      } else {
        dueDateIso = occurrenceDate
      }
      // Ocorrências já vêm só do mês selecionado; não filtrar pela data da fatura.
      rows.push({
        key: `rec:${rule.id}:${occurrenceDate}`,
        dueDateIso,
        title: rule.title,
        subtitle:
          rule.frequency === "monthly"
            ? "Recorrência mensal"
            : "Recorrência semanal",
        type: rule.type,
        amount: rule.amount,
        amountIsKnown: true,
        source: "recurring",
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        cardId: rule.cardId,
        paymentMethod: rule.paymentMethod,
        competenceIso,
      })
    }
  }

  for (const p of plannedPayments) {
    if (p.targetYear !== year || p.targetMonth !== month) continue
    const hasAmt = typeof p.estimatedAmount === "number"
    rows.push({
      key: `planpay:${p.id}`,
      dueDateIso: `${year}-${pad2(month)}-15`,
      title: p.title,
      subtitle: "Planejamento (sem dia fixo)",
      type: p.type,
      amount: hasAmt ? p.estimatedAmount! : 0,
      amountIsKnown: hasAmt,
      source: "planned_payment",
      categoryId: p.categoryId,
    })
  }

  function projectionSortKey(r: MonthlyProjectionItem): string {
    return r.competenceIso ?? r.dueDateIso
  }

  return rows.sort((a, b) => {
    const ka = projectionSortKey(a)
    const kb = projectionSortKey(b)
    if (ka !== kb) {
      return ka.localeCompare(kb)
    }
    if (a.type !== b.type) {
      if (a.type === "expense" && b.type === "income") return -1
      if (a.type === "income" && b.type === "expense") return 1
    }
    return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
  })
}
