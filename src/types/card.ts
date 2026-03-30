export interface Card {
  id: string
  name: string
  /** Imagem opcional (data URL), ex.: logo da bandeira ou do produto. */
  logoDataUrl: string
  /** Conta usada para pagar a fatura deste cartão de crédito. */
  accountId: string
  active: boolean
  closingDay: number
  dueDay: number
  limit: number
  /**
   * Cor principal do gradiente na visualização da carteira (`#rrggbb`).
   * String vazia = gradiente automático pelo id do cartão.
   */
  walletAccentHex: string
  createdAt: string
  updatedAt: string
}

export type CreateCardInput = Omit<Card, "id" | "createdAt" | "updatedAt">

export type UpdateCardInput = Partial<Omit<Card, "id">> & {
  id: string
}
