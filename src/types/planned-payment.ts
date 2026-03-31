import type { TransactionType } from "./transaction"

export type PlannedPaymentStatus = "pending"

export interface PlannedPayment {
  id: string
  title: string
  /** Imagem opcional (data URL), ex.: logo do imposto/fornecedor. */
  logoDataUrl: string
  /**
   * Cor principal na lista (#rrggbb).
   * String vazia = destaque automático.
   */
  walletAccentHex: string
  type: TransactionType
  categoryId: string
  targetYear: number
  targetMonth: number
  estimatedAmount?: number
  description: string
  status: PlannedPaymentStatus
  createdAt: string
  updatedAt: string
}

export type CreatePlannedPaymentInput = Omit<
  PlannedPayment,
  "id" | "status" | "createdAt" | "updatedAt"
>

export type UpdatePlannedPaymentInput = Partial<
  Omit<PlannedPayment, "id" | "status" | "createdAt" | "updatedAt">
> & {
  id: string
}
