export type TransactionType = "income" | "expense"

export type PaymentMethod =
  | "pix"
  | "debit_card"
  | "credit_card"
  | "boleto"
  | "cash"
  /** Saída na conta corrente que abate dívida do cartão (fatura). */
  | "credit_card_settlement"
  /** Transferência entre contas correntes (par saída + entrada com o mesmo `transferGroupId`). */
  | "account_transfer"

export interface Transaction {
  id: string
  title: string
  amount: number
  type: TransactionType
  /** Obrigatória, exceto em `credit_card_settlement` e `account_transfer`. */
  categoryId?: string
  paymentMethod: PaymentMethod
  /** Conta do caixa (obrigatória). Em compras no crédito não altera saldo até a liquidação. */
  accountId: string
  /** Só em compras no crédito ou pagamento de fatura. */
  cardId?: string
  /** Data de fechamento da fatura paga (`YYYY-MM-DD`), só em `credit_card_settlement`. */
  statementPeriodKey?: string
  /** Agrupa as duas pernas de uma transferência entre contas (mesmo id nas duas transações). */
  transferGroupId?: string
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

export type CreateAccountTransferInput = {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description?: string
}
