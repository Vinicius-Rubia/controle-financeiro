import { transactionAffectsCashBalance } from "@/lib/account-ui"
import type { Transaction } from "@/types/transaction"

export type TransactionTypeFilter = "all" | "income" | "expense"

export type CashScopeFilter = "all" | "cash_only"

export interface TransactionListFilters {
  type: TransactionTypeFilter
  /** `"all"` ou id da categoria */
  categoryId: string
  /** `"all"` ou id da conta */
  accountId: string
  /** Caixa (conta) vs todos os lançamentos incluindo compras no crédito. */
  cashScope: CashScopeFilter
  dateFrom: string
  dateTo: string
  search: string
}

function parseTxDateToTime(date: string): number {
  const v = date.trim()

  // App armazena `date` em `YYYY-MM-DD`, mas dados legados podem vir com outro formato.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (isoMatch) {
    const y = Number(isoMatch[1])
    const m = Number(isoMatch[2])
    const d = Number(isoMatch[3])
    return Date.UTC(y, m - 1, d)
  }

  // Ex.: `DD/MM/YYYY`
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v)
  if (brMatch) {
    const d = Number(brMatch[1])
    const m = Number(brMatch[2])
    const y = Number(brMatch[3])
    return Date.UTC(y, m - 1, d)
  }

  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : NaN
}

function parseTxUpdatedAtToTime(dateTime: string): number {
  const t = new Date(dateTime).getTime()
  return Number.isFinite(t) ? t : 0
}

export function filterAndSortTransactions(
  items: Transaction[],
  filters: TransactionListFilters
): Transaction[] {
  let out = [...items]

  if (filters.type !== "all") {
    out = out.filter((t) => t.type === filters.type)
  }

  if (filters.categoryId && filters.categoryId !== "all") {
    out = out.filter((t) => t.categoryId === filters.categoryId)
  }

  if (filters.accountId && filters.accountId !== "all") {
    out = out.filter((t) => t.accountId === filters.accountId)
  }

  if (filters.cashScope === "cash_only") {
    out = out.filter((t) => transactionAffectsCashBalance(t))
  }

  const from = filters.dateFrom.trim()
  if (from) {
    out = out.filter((t) => t.date >= from)
  }

  const to = filters.dateTo.trim()
  if (to) {
    out = out.filter((t) => t.date <= to)
  }

  const q = filters.search.trim().toLowerCase()
  if (q) {
    out = out.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    )
  }

  out.sort((a, b) => {
    const ta = parseTxDateToTime(a.date)
    const tb = parseTxDateToTime(b.date)

    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
      // Mais recente -> mais antigo
      return tb - ta
    }

    // Fallback caso as datas não sejam parseáveis.
    const byDateFallback = b.date.localeCompare(a.date)
    if (byDateFallback !== 0) return byDateFallback

    // Mesma data: mantém ordem coerente por edição/criação.
    const ub = parseTxUpdatedAtToTime(b.updatedAt)
    const ua = parseTxUpdatedAtToTime(a.updatedAt)
    if (ub !== ua) return ub - ua

    const cb = parseTxUpdatedAtToTime(b.createdAt)
    const ca = parseTxUpdatedAtToTime(a.createdAt)
    if (cb !== ca) return cb - ca

    // Último desempate determinístico.
    return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
  })

  return out
}
