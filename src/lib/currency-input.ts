export function maskCurrencyInputBR(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""

  const value = Number(digits) / 100
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseCurrencyInputBR(raw: string): number | null {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return null

  const value = Number(digits) / 100
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export function formatCurrencyInputBRFromNumber(value: number): string {
  if (!Number.isFinite(value)) return ""
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Centavos inteiros — comparações seguras após somatórios em float. */
export function moneyToCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100)
}
