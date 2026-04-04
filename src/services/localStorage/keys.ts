/** Versão nas chaves permite migrações futuras sem colidir com dados antigos. */
export const STORAGE_KEYS = {
  categories: "controle-financeiro.categories.v2",
  transactions: "controle-financeiro.transactions.v2",
  cards: "controle-financeiro.cards.v1",
  accounts: "controle-financeiro.accounts.v1",
  recurring: "controle-financeiro.recurring.v1",
  installmentPlans: "controle-financeiro.installment-plans.v1",
  plannedPayments: "controle-financeiro.planned-payments.v1",
  savingsGoals: "controle-financeiro.savings-goals.v1",
} as const

/** Chaves legadas (v1) — usadas só para migração pontual na primeira leitura. */
export const LEGACY_STORAGE_KEYS = {
  categories: "controle-financeiro.categories.v1",
  transactions: "controle-financeiro.transactions.v1",
} as const
