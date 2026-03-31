import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  PlusIcon,
  TagsIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { CategoryDeleteDialog } from "@/components/categories/category-delete-dialog"
import { CategoryFormDialog } from "@/components/categories/category-form-dialog"
import { CategoryListCards } from "@/components/categories/category-list-cards"
import { CategoryListTable } from "@/components/categories/category-list-table"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useCategories } from "@/hooks/use-categories"
import { useTransactions } from "@/hooks/use-transactions"
import { cn } from "@/lib/utils"
import { countTransactionsForCategory } from "@/services/category-service"
import type { Category } from "@/types/category"

export function CategoriasPage() {
  const { categories, create, update, remove } = useCategories()
  const { transactions } = useTransactions()

  const [formOpen, setFormOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      ),
    [categories]
  )

  const typeCounts = useMemo(() => {
    let income = 0
    let expense = 0
    for (const c of categories) {
      if (c.type === "income") income += 1
      else expense += 1
    }
    return { income, expense, total: categories.length }
  }, [categories])

  const deleteTransactionCount = deleteTarget
    ? countTransactionsForCategory(transactions, deleteTarget.id)
    : 0

  const openCreate = () => {
    setCategoryToEdit(null)
    setFormOpen(true)
  }

  const openEdit = (category: Category) => {
    setCategoryToEdit(category)
    setFormOpen(true)
  }

  const confirmDelete = (): boolean => {
    const id = deleteTarget?.id
    if (!id) return false
    const ok = remove(id)
    if (ok) toast.success("Categoria excluída.")
    else toast.error("Não foi possível excluir a categoria.")
    return ok
  }

  const hasCategories = categories.length > 0

  return (
    <div className="flex flex-col gap-8">
      {!hasCategories ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
            <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
            <div className="relative">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Categorias
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                Organize receitas e despesas. Cada nome deve ser único para o
                mesmo tipo (receita ou despesa).
              </p>
            </div>
          </div>
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TagsIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhuma categoria ainda</EmptyTitle>
              <EmptyDescription>
                Crie categorias para classificar seus lançamentos. Você pode
                definir se cada uma vale só para receita ou só para despesa.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" onClick={openCreate}>
                <PlusIcon data-icon="inline-start" />
                Criar primeira categoria
              </Button>
            </EmptyContent>
          </Empty>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
            <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                  Categorias
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Classifique lançamentos por tipo (dados locais). Nomes únicos por
                  combinação de escopo.
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                className="font-semibold"
                onClick={openCreate}
              >
                <PlusIcon data-icon="inline-start" />
                Nova categoria
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card rounded-xl border p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="bg-primary/10 rounded-lg p-2">
                  <TagsIcon className="text-primary size-5" />
                </div>
                <span className="text-muted-foreground px-2 py-0.5 text-xs">
                  Total
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Categorias cadastradas
              </p>
              <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
                {typeCounts.total}
              </h3>
            </div>

            <div className="bg-card rounded-xl border p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-emerald-500/15 p-2">
                  <ArrowUpRightIcon className="size-5 text-emerald-500" />
                </div>
                <span className="text-muted-foreground px-2 py-0.5 text-xs">
                  Receita
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Só para entradas
              </p>
              <h3
                className={cn(
                  "mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight",
                  typeCounts.income === 0 && "text-muted-foreground"
                )}
              >
                {typeCounts.income}
              </h3>
            </div>

            <div className="bg-card rounded-xl border p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-destructive/15 p-2">
                  <ArrowDownLeftIcon className="text-destructive size-5" />
                </div>
                <span className="text-muted-foreground px-2 py-0.5 text-xs">
                  Despesa
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Só para saídas
              </p>
              <h3
                className={cn(
                  "mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight",
                  typeCounts.expense === 0 && "text-muted-foreground"
                )}
              >
                {typeCounts.expense}
              </h3>
            </div>

          </div>

          <div className="hidden md:block">
            <CategoryListTable
              categories={sortedCategories}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </div>
          <div className="md:hidden">
            <CategoryListCards
              categories={sortedCategories}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </div>
        </>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setCategoryToEdit(null)
        }}
        categories={categories}
        categoryToEdit={categoryToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <CategoryDeleteDialog
        category={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        transactionCount={deleteTransactionCount}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
