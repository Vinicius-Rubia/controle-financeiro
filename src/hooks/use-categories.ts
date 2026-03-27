import { useCallback, useState } from "react"

import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from "@/services/localStorage/finance-storage"
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/category"

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(() =>
    listCategories()
  )

  const refresh = useCallback(() => {
    setCategories(listCategories())
  }, [])

  const create = useCallback(
    (input: CreateCategoryInput) => {
      const created = createCategory(input)
      refresh()
      return created
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdateCategoryInput) => {
      const next = updateCategory(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteCategory(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  return {
    categories,
    refresh,
    create,
    update,
    remove,
    getById: getCategoryById,
  }
}
