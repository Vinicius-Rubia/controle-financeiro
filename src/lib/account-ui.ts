import type { Account, AccountKind } from "@/types/account"
import type { Transaction } from "@/types/transaction"

const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro (espécie)",
  investment: "Investimentos",
  other: "Outra",
}

export function accountKindLabel(kind: AccountKind): string {
  return ACCOUNT_KIND_LABELS[kind]
}

export function firstActiveAccountId(accounts: Account[]): string {
  const a = accounts.find((x) => x.active)
  return a?.id ?? ""
}

/** Movimento que altera saldo em conta na data do lançamento (não inclui compras no crédito). */
export function transactionAffectsCashBalance(t: Transaction): boolean {
  if (t.paymentMethod === "credit_card") return false
  return true
}

/**
 * Saldo líquido na conta a partir dos lançamentos que movimentam caixa na data.
 * Compras no crédito não entram aqui — ficam na fatura do cartão.
 */
export function accountNetBalance(
  transactions: Transaction[],
  accountId: string
): number {
  let bal = 0
  for (const t of transactions) {
    if (t.accountId !== accountId) continue
    if (!transactionAffectsCashBalance(t)) continue
    if (t.type === "income") bal += t.amount
    else bal -= t.amount
  }
  return bal
}
