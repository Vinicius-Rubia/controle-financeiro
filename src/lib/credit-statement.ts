import type { Card } from "@/types/card"
import type { Transaction } from "@/types/transaction"

/** Saldo em aberto após somar vários lançamentos (evita 499,999… vs 500,00 no pagamento). */
function roundBRL2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

const ISO_RX = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Data de fechamento da fatura em que entra a compra com `isoDate` (`YYYY-MM-DD`).
 * Regra: tudo após o fechamento do mês anterior até o dia anterior ao fechamento atual.
 * Compra feita no dia do fechamento entra no próximo ciclo.
 */
export function closingDateForPurchaseDate(
  isoDate: string,
  closingDay: number
): string {
  const m = ISO_RX.exec(isoDate.trim())
  if (!m) return isoDate
  const y = Number(m[1])
  const month1 = Number(m[2])
  const d = Number(m[3])
  const m0 = month1 - 1
  const lastDay = daysInMonth(y, m0)
  const closeD = Math.min(closingDay, lastDay)
  if (d < closeD) {
    return `${y}-${String(month1).padStart(2, "0")}-${String(closeD).padStart(2, "0")}`
  }
  let nm = m0 + 1
  let ny = y
  if (nm > 11) {
    nm = 0
    ny += 1
  }
  const lastNext = daysInMonth(ny, nm)
  const closeD2 = Math.min(closingDay, lastNext)
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(closeD2).padStart(2, "0")}`
}

export function statementPeriodKeyForPurchase(
  txDate: string,
  closingDay: number
): string {
  return closingDateForPurchaseDate(txDate, closingDay)
}

/** Fatura “aberta” atual: próximo fechamento a partir de `todayIso`. */
export function currentOpenStatementClosingIso(
  todayIso: string,
  closingDay: number
): string {
  return closingDateForPurchaseDate(todayIso, closingDay)
}

/**
 * Data do 1º vencimento para um parcelamento novo no crédito, conforme o ciclo
 * do cartão na data da compra (fechamento / vencimento).
 */
export function firstInstallmentDueDateForCreditPurchase(
  todayIso: string,
  card: Pick<Card, "closingDay" | "dueDay">
): string {
  const closingIso = currentOpenStatementClosingIso(todayIso, card.closingDay)
  return dueDateForStatementClosing(closingIso, card.dueDay)
}

/**
 * Data de vencimento estimada para o ciclo com fechamento em `closingIso`.
 * Regra:
 * - se `dueDay` for após o dia de fechamento, vence no mesmo mês;
 * - se `dueDay` for no mesmo dia ou antes do fechamento, vence no mês seguinte.
 */
export function dueDateForStatementClosing(
  closingIso: string,
  dueDay: number
): string {
  const m = ISO_RX.exec(closingIso.trim())
  if (!m) return closingIso
  let y = Number(m[1])
  let month1 = Number(m[2])
  const closingDay = Number(m[3])

  if (dueDay <= closingDay) {
    if (month1 === 12) {
      month1 = 1
      y += 1
    } else {
      month1 += 1
    }
  }

  const m0 = month1 - 1
  const ld = daysInMonth(y, m0)
  const dd = Math.min(dueDay, ld)
  return `${y}-${String(month1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
}

export function creditCycleNetAmount(
  transactions: Transaction[],
  cardId: string,
  closingDay: number,
  closingDateIso: string
): number {
  let sum = 0
  for (const t of transactions) {
    if (t.cardId !== cardId || t.paymentMethod !== "credit_card") continue
    if (statementPeriodKeyForPurchase(t.date, closingDay) !== closingDateIso) continue
    if (t.type === "expense") sum += t.amount
    else sum -= t.amount
  }
  return sum
}

export function settlementsTotalForCycle(
  transactions: Transaction[],
  cardId: string,
  closingDateIso: string
): number {
  let paid = 0
  for (const t of transactions) {
    if (t.cardId !== cardId || t.paymentMethod !== "credit_card_settlement") {
      continue
    }
    if (t.statementPeriodKey?.trim() !== closingDateIso) continue
    paid += t.amount
  }
  return paid
}

export function cycleOutstanding(
  transactions: Transaction[],
  card: Card,
  closingDateIso: string
): number {
  const net = creditCycleNetAmount(
    transactions,
    card.id,
    card.closingDay,
    closingDateIso
  )
  const paid = settlementsTotalForCycle(transactions, card.id, closingDateIso)
  return roundBRL2(Math.max(0, net - paid))
}

export function listStatementClosingDatesForCard(
  transactions: Transaction[],
  card: Card
): string[] {
  const keys = new Set<string>()
  for (const t of transactions) {
    if (t.cardId !== card.id) continue
    if (t.paymentMethod === "credit_card") {
      keys.add(statementPeriodKeyForPurchase(t.date, card.closingDay))
    }
    if (
      t.paymentMethod === "credit_card_settlement" &&
      t.statementPeriodKey?.trim()
    ) {
      keys.add(t.statementPeriodKey.trim())
    }
  }
  return [...keys].sort()
}

/** Dívida total não paga no crédito (soma dos ciclos com saldo > 0). */
export function totalCreditOutstanding(
  transactions: Transaction[],
  card: Card
): number {
  let total = 0
  for (const closeIso of listStatementClosingDatesForCard(transactions, card)) {
    total += cycleOutstanding(transactions, card, closeIso)
  }
  return total
}

export function creditAvailableRawFromOutstanding(
  card: Card,
  transactions: Transaction[]
): number {
  return card.limit - totalCreditOutstanding(transactions, card)
}

export interface StatementSummaryRow {
  closingDateIso: string
  netPurchases: number
  paid: number
  outstanding: number
  dueDateIso: string
}

export function statementSummariesForCard(
  transactions: Transaction[],
  card: Card
): StatementSummaryRow[] {
  return listStatementClosingDatesForCard(transactions, card).map(
    (closingDateIso) => {
      const net = creditCycleNetAmount(
        transactions,
        card.id,
        card.closingDay,
        closingDateIso
      )
      const paid = settlementsTotalForCycle(
        transactions,
        card.id,
        closingDateIso
      )
      return {
        closingDateIso,
        netPurchases: net,
        paid,
        outstanding: cycleOutstanding(transactions, card, closingDateIso),
        dueDateIso: dueDateForStatementClosing(closingDateIso, card.dueDay),
      }
    }
  )
}

/** Inclui a fatura “aberta” atual mesmo sem lançamentos ainda. */
export function allStatementClosingDatesForCard(
  transactions: Transaction[],
  card: Card,
  todayIso: string
): string[] {
  const fromTx = listStatementClosingDatesForCard(transactions, card)
  const current = currentOpenStatementClosingIso(todayIso, card.closingDay)
  const keys = new Set(fromTx)
  keys.add(current)
  return [...keys].sort((a, b) => a.localeCompare(b))
}

export function statementSummaryForClosing(
  transactions: Transaction[],
  card: Card,
  closingDateIso: string
): StatementSummaryRow {
  const net = creditCycleNetAmount(
    transactions,
    card.id,
    card.closingDay,
    closingDateIso
  )
  const paid = settlementsTotalForCycle(
    transactions,
    card.id,
    closingDateIso
  )
  return {
    closingDateIso,
    netPurchases: net,
    paid,
    outstanding: cycleOutstanding(transactions, card, closingDateIso),
    dueDateIso: dueDateForStatementClosing(closingDateIso, card.dueDay),
  }
}

/** Compras no crédito do ciclo, mais recentes primeiro. */
export function creditPurchasesInCycle(
  transactions: Transaction[],
  cardId: string,
  closingDay: number,
  closingDateIso: string
): Transaction[] {
  const list = transactions.filter((t) => {
    if (t.cardId !== cardId || t.paymentMethod !== "credit_card") return false
    return statementPeriodKeyForPurchase(t.date, closingDay) === closingDateIso
  })
  list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.createdAt.localeCompare(a.createdAt)
  })
  return list
}

/** Pagamentos de fatura vinculados ao ciclo. */
export function settlementTransactionsInCycle(
  transactions: Transaction[],
  cardId: string,
  closingDateIso: string
): Transaction[] {
  const list = transactions.filter(
    (t) =>
      t.cardId === cardId &&
      t.paymentMethod === "credit_card_settlement" &&
      t.statementPeriodKey?.trim() === closingDateIso
  )
  list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.createdAt.localeCompare(a.createdAt)
  })
  return list
}
