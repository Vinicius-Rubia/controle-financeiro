import { totalCreditOutstanding } from "@/lib/credit-statement"
import type { Card } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { Transaction } from "@/types/transaction"

/** Compras no crédito líquidas (histórico bruto, sem abatimento de pagamentos). */
export function creditNetUsedForCard(
  transactions: Transaction[],
  cardId: string
): number {
  let used = 0
  for (const t of transactions) {
    if (t.cardId !== cardId || t.paymentMethod !== "credit_card") continue
    if (t.type === "expense") used += t.amount
    else used -= t.amount
  }
  return used
}

export function creditAvailableRaw(
  card: Card,
  transactions: Transaction[]
): number {
  return card.limit - totalCreditOutstanding(transactions, card)
}

export function creditReservedForCard(
  installmentPlans: InstallmentPlan[],
  cardId: string
): number {
  let sum = 0
  for (const p of installmentPlans) {
    if (p.paymentMethod !== "credit_card" || p.cardId !== cardId) continue
    sum += p.reservedAmount
  }
  return sum
}

export function creditAvailableConsideringReserved(
  card: Card,
  transactions: Transaction[],
  installmentPlans: InstallmentPlan[]
): number {
  const raw = creditAvailableRaw(card, transactions)
  const reserved = creditReservedForCard(installmentPlans, card.id)
  return raw - reserved
}

export function creditAvailableConsideringReservedDisplayed(
  card: Card,
  transactions: Transaction[],
  installmentPlans: InstallmentPlan[]
): number {
  return Math.max(0, creditAvailableConsideringReserved(card, transactions, installmentPlans))
}

/** Limite disponível para exibição (não negativo). */
export function creditAvailableDisplayed(
  card: Card,
  transactions: Transaction[]
): number {
  return Math.max(0, creditAvailableRaw(card, transactions))
}

export function cardLedgerSummary(card: Card, transactions: Transaction[]) {
  const creditOutstanding = totalCreditOutstanding(transactions, card)
  const creditUsedGross = creditNetUsedForCard(transactions, card.id)
  const creditAvail = creditAvailableDisplayed(card, transactions)
  const creditAvailRaw = creditAvailableRaw(card, transactions)

  return {
    creditOutstanding,
    creditUsedGross,
    creditUsed: creditOutstanding,
    creditAvailable: creditAvail,
    creditAvailableRaw: creditAvailRaw,
  }
}

export function cardLedgerSummaryWithReserved(
  card: Card,
  transactions: Transaction[],
  installmentPlans: InstallmentPlan[]
) {
  const base = cardLedgerSummary(card, transactions)
  const reserved = creditReservedForCard(installmentPlans, card.id)
  const availableConsideringReserved = Math.max(0, base.creditAvailableRaw - reserved)

  return {
    ...base,
    creditReserved: reserved,
    creditAvailableConsideringReserved: availableConsideringReserved,
    creditAvailableConsideringReservedRaw: base.creditAvailableRaw - reserved,
  }
}
