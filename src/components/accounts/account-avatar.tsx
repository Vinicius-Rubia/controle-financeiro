import { cn } from "@/lib/utils"

const FALLBACK_COLORS = [
  "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
]

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function colorIndexFromName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % FALLBACK_COLORS.length
}

export function AccountAvatar({
  name,
  logoDataUrl,
  sizeClassName = "size-8",
  entityLabel = "conta",
  entityArticle = "da",
}: {
  name: string
  logoDataUrl?: string
  sizeClassName?: string
  entityLabel?: string
  entityArticle?: "da" | "do"
}) {
  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        alt={`Logo ${entityArticle} ${entityLabel} ${name}`}
        className={cn(sizeClassName, "rounded-md border object-cover")}
      />
    )
  }

  const initials = initialsFromName(name)
  const colorClassName = FALLBACK_COLORS[colorIndexFromName(name)]

  return (
    <div
      aria-hidden
      className={cn(
        sizeClassName,
        "inline-flex items-center justify-center rounded-md border text-xs font-semibold uppercase",
        colorClassName
      )}
    >
      {initials}
    </div>
  )
}
