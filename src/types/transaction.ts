export type TransactionType = "income" | "expense"

export type PaymentMethod =
  | "pix"
  | "debit_card"
  | "credit_card"
  | "boleto"
  | "cash"
  /** Saída na conta corrente que abate dívida do cartão (fatura). */
  | "credit_card_settlement"

export interface Transaction {
  id: string
  title: string
  amount: number
  type: TransactionType
  /** Obrigatória, exceto em `credit_card_settlement` (liquidação da fatura). */
  categoryId?: string
  paymentMethod: PaymentMethod
  /** Conta do caixa (obrigatória). Em compras no crédito não altera saldo até a liquidação. */
  accountId: string
  /** Só em compras no crédito ou pagamento de fatura. */
  cardId?: string
  /** Data de fechamento da fatura paga (`YYYY-MM-DD`), só em `credit_card_settlement`. */
  statementPeriodKey?: string
  date: string
  description: string
  createdAt: string
  updatedAt: string
}

export type CreateTransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>

export type UpdateTransactionInput = Partial<Omit<Transaction, "id">> & {
  id: string
}
