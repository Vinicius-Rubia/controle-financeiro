import type {
  PaymentMethod,
  Transaction,
  TransactionType,
} from "@/types/transaction"

const LABELS: Record<TransactionType, string> = {
  income: "Entrada",
  expense: "Saída",
}

export function transactionTypeLabel(type: TransactionType): string {
  return LABELS[type]
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  boleto: "Boleto",
  cash: "Dinheiro",
  credit_card_settlement: "Pagamento de fatura",
  account_transfer: "Transferência entre contas",
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}

export function transactionCategoryDisplay(
  t: Transaction,
  categoryNameById: Map<string, string>
): string {
  if (t.categoryId) {
    return categoryNameById.get(t.categoryId) ?? "—"
  }
  if (t.paymentMethod === "account_transfer") {
    return "Transferência entre contas"
  }
  return "—"
}

/** `date` no formato `YYYY-MM-DD` (armazenado na transação). */
export function formatTransactionDate(isoDate: string): string {
  const parts = isoDate.split("-").map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return isoDate
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR")
}

export function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
