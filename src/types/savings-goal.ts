export interface SavingsGoalContribution {
  id: string
  /** Data do aporte (YYYY-MM-DD). */
  date: string
  /** Valor em BRL. */
  amount: number
  /** Conta da qual saiu o valor (aportes antigos podem não ter). */
  accountId?: string
  /** Despesa vinculada no extrato; ao remover o aporte, o lançamento é excluído. */
  transactionId?: string
  note?: string
}

export interface SavingsGoal {
  id: string
  title: string
  /** Quanto você pretende guardar por mês (BRL). */
  monthlyTargetAmount: number
  /** Meta total opcional (ex.: custo da viagem). `null` = só acompanhamento por aportes. */
  targetTotalAmount: number | null
  /** Prazo opcional para concluir a meta (YYYY-MM-DD). */
  targetDeadlineDate: string | null
  contributions: SavingsGoalContribution[]
  createdAt: string
  updatedAt: string
}

export type CreateSavingsGoalInput = Pick<
  SavingsGoal,
  "title" | "monthlyTargetAmount"
> & {
  targetTotalAmount?: number | null
  targetDeadlineDate?: string | null
}

export type UpdateSavingsGoalInput = {
  id: string
  title?: string
  monthlyTargetAmount?: number
  targetTotalAmount?: number | null
  targetDeadlineDate?: string | null
}
