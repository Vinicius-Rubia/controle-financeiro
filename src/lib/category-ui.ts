import type { CategoryType } from "@/types/category"

const LABELS: Record<CategoryType, string> = {
  income: "Receita",
  expense: "Despesa",
  both: "Receita e despesa",
}

export function categoryTypeLabel(type: CategoryType): string {
  return LABELS[type]
}
