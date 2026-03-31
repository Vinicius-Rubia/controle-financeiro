export type CategoryType = "income" | "expense"

export interface Category {
  id: string
  name: string
  type: CategoryType
  createdAt: string
  updatedAt: string
}

export type CreateCategoryInput = Omit<Category, "id" | "createdAt" | "updatedAt">

export type UpdateCategoryInput = Partial<Omit<Category, "id">> & { id: string }
