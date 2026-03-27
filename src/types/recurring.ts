import type { PaymentMethod, TransactionType } from "./transaction"

export type RecurringFrequency = "monthly" | "weekly"

export interface RecurringRule {
  id: string
  title: string
  /** Imagem opcional (data URL), ex.: logo do fornecedor ou do serviço. */
  logoDataUrl: string
  amount: number
  type: TransactionType
  categoryId: string
  paymentMethod: PaymentMethod
  accountId: string
  cardId?: string
  description: string
  frequency: RecurringFrequency
  /** Dia do mês (1–31) quando `frequency === "monthly"`. */
  dayOfMonth?: number
  /** Dia da semana (0 = domingo … 6 = sábado) quando `frequency === "weekly"`. */
  weekday?: number
  active: boolean
  /** Quando `true` e `frequency === "monthly"`, cria lançamento ao abrir o app após o dia do mês (uma vez por mês). */
  autoPost: boolean
  /** `YYYY-MM` do último autopost efetuado. */
  lastAutoPostedMonthKey?: string
  lastPostedAt?: string
  createdAt: string
  updatedAt: string
}

export type CreateRecurringRuleInput = Omit<
  RecurringRule,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "lastPostedAt"
  | "lastAutoPostedMonthKey"
>

export type UpdateRecurringRuleInput = Partial<
  Omit<RecurringRule, "id" | "createdAt">
> & {
  id: string
}
