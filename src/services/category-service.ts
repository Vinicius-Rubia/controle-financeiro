import type { Category, CategoryType } from "@/types/category"
import type { Transaction, TransactionType } from "@/types/transaction"

export function categoryAcceptsTransactionType(
  category: Category,
  txType: TransactionType
): boolean {
  if (category.type === "both") return true
  return category.type === txType
}

function duplicateKey(name: string, type: CategoryType): string {
  return `${name.trim().toLowerCase()}|${type}`
}

/** Nome exibido e persistido (apenas trim; capitalização preservada). */
export function normalizeCategoryName(name: string): string {
  return name.trim()
}

export function findDuplicateCategory(
  categories: Category[],
  name: string,
  type: CategoryType,
  excludeId?: string
): Category | undefined {
  const key = duplicateKey(name, type)
  return categories.find(
    (c) => c.id !== excludeId && duplicateKey(c.name, c.type) === key
  )
}

export function countTransactionsForCategory(
  transactions: Transaction[],
  categoryId: string
): number {
  return transactions.filter((t) => t.categoryId === categoryId).length
}
