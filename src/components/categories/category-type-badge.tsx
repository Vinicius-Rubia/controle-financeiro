import { Badge } from "@/components/ui/badge"
import { categoryTypeLabel } from "@/lib/category-ui"
import type { CategoryType } from "@/types/category"

export function CategoryTypeBadge({ type }: { type: CategoryType }) {
  const badgeClassByType: Record<CategoryType, string> = {
    income:
      "border-emerald-500/20 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400",
    expense:
      "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20",
  }

  return (
    <Badge variant="outline" className={badgeClassByType[type]}>
      {categoryTypeLabel(type)}
    </Badge>
  )
}
