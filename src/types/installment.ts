import type { PaymentMethod, TransactionType } from "./transaction"

export type InstallmentPlanStatus = "active" | "completed" | "cancelled"
export type InstallmentStatus = "reserved" | "posted" | "cancelled"

export interface Installment {
  id: string
  number: number
  amount: number
  dueDate: string
  status: InstallmentStatus
  postedAt?: string
  settledAmount?: number
  paymentTransactionId?: string
}

export interface InstallmentPlan {
  id: string
  title: string
  /** Imagem opcional (data URL), ex.: logo da loja ou fornecedor. */
  logoDataUrl: string
  totalAmount: number
  installmentCount: number
  type: TransactionType
  categoryId: string
  paymentMethod: Exclude<PaymentMethod, "credit_card_settlement">
  accountId: string
  cardId?: string
  description: string
  status: InstallmentPlanStatus
  /** Valor ainda reservado no limite do cartão (não lançado na fatura). */
  reservedAmount: number
  /** Valor já lançado em fatura a partir das parcelas. */
  postedAmount: number
  installments: Installment[]
  createdAt: string
  updatedAt: string
}

export type CreateInstallmentPlanInput = Omit<
  InstallmentPlan,
  | "id"
  | "status"
  | "reservedAmount"
  | "postedAmount"
  | "installments"
  | "createdAt"
  | "updatedAt"
> & {
  firstDueDate: string
}

export type UpdateInstallmentPlanInput = Partial<
  Omit<
    InstallmentPlan,
    | "id"
    | "status"
    | "reservedAmount"
    | "postedAmount"
    | "installments"
    | "createdAt"
    | "updatedAt"
  >
> & {
  id: string
}
