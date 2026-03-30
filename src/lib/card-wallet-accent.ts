import type { CSSProperties } from "react"

const HEX6 = /^#[0-9A-Fa-f]{6}$/

/** Presets alinhados aos gradientes antigos da carteira (hex para o tom principal). */
export const CARD_WALLET_ACCENT_PRESETS: { label: string; hex: string }[] = [
  { label: "Cinza", hex: "#64748b" },
  { label: "Índigo", hex: "#4f46e5" },
  { label: "Esmeralda", hex: "#059669" },
  { label: "Rosa", hex: "#e11d48" },
  { label: "Âmbar", hex: "#d97706" },
  { label: "Azul", hex: "#2563eb" },
]

export function normalizeWalletAccentHex(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (!t) return ""
  return HEX6.test(t) ? t : ""
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const h = m[1]
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function mixTo(
  hex: string,
  weight: number,
  tr: number,
  tg: number,
  tb: number
): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgb(${tr},${tg},${tb})`
  const w = Math.min(1, Math.max(0, weight))
  const r = Math.round(rgb.r * w + tr * (1 - w))
  const g = Math.round(rgb.g * w + tg * (1 - w))
  const b = Math.round(rgb.b * w + tb * (1 - w))
  return `rgb(${r},${g},${b})`
}

/** Gradiente do cartão na carteira a partir de um accent #rrggbb. */
export function cardWalletBackgroundStyle(hex: string): CSSProperties | undefined {
  const n = normalizeWalletAccentHex(hex)
  if (!n) return undefined
  const mid = mixTo(n, 0.55, 15, 23, 42)
  return {
    backgroundImage: `linear-gradient(to bottom right, ${n}, ${mid}, rgb(15, 23, 42))`,
  }
}

export function isValidWalletAccentHex(s: string): boolean {
  const t = s.trim()
  return t === "" || HEX6.test(t)
}
