const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function formatCurrencyBRL(value: number): string {
  return BRL.format(value)
}
