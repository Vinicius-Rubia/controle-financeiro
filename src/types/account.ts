export type AccountKind =
  | "checking"
  | "savings"
  | "cash"
  | "investment"
  | "other"

export interface Account {
  id: string
  name: string
  kind: AccountKind
  active: boolean
  /** Imagem opcional (data URL), ex.: logo do banco. */
  logoDataUrl: string
  createdAt: string
  updatedAt: string
}

export type CreateAccountInput = Omit<Account, "id" | "createdAt" | "updatedAt">

export type UpdateAccountInput = Partial<Omit<Account, "id">> & {
  id: string
}
