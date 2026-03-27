import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon, PlusIcon } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  findDuplicateCategory,
  normalizeCategoryName,
} from "@/services/category-service"
import type {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/category"

const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome.")
    .max(100, "No máximo 100 caracteres."),
  type: z.enum(["income", "expense", "both"]),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

function defaultValues(category: Category | null): CategoryFormValues {
  if (!category) {
    return { name: "", type: "expense" }
  }
  return { name: category.name, type: category.type }
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  categories,
  categoryToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  categoryToEdit: Category | null
  onCreate: (input: CreateCategoryInput) => void
  onUpdate: (input: UpdateCategoryInput) => Category | null
}) {
  const isEdit = categoryToEdit !== null

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaultValues(categoryToEdit),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(categoryToEdit))
    }
  }, [open, categoryToEdit, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const name = normalizeCategoryName(values.name)
    if (!name) {
      form.setError("name", { message: "Informe o nome." })
      toast.error("Nome inválido.")
      return
    }

    const duplicate = findDuplicateCategory(
      categories,
      name,
      values.type,
      categoryToEdit?.id
    )
    if (duplicate) {
      form.setError("name", {
        message: "Já existe uma categoria com o mesmo nome e tipo.",
      })
      toast.error("Duplicidade de categoria.")
      return
    }

    await new Promise((r) => requestAnimationFrame(r))

    try {
      if (categoryToEdit) {
        const next = onUpdate({
          id: categoryToEdit.id,
          name,
          type: values.type,
        })
        if (next === null) {
          toast.error("Não foi possível atualizar a categoria.")
          return
        }
        toast.success("Categoria atualizada.")
      } else {
        onCreate({ name, type: values.type })
        toast.success("Categoria criada.")
      }
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível salvar a categoria.")
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
          <DialogDescription>
            Defina um nome e se a categoria vale para receitas, despesas ou
            ambos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field
              data-invalid={form.formState.errors.name ? true : undefined}
            >
              <FieldLabel htmlFor="category-name">Nome</FieldLabel>
              <Input
                id="category-name"
                autoComplete="off"
                placeholder="Ex.: Alimentação"
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field
              data-invalid={form.formState.errors.type ? true : undefined}
            >
              <FieldLabel>Tipo</FieldLabel>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    className="w-full justify-stretch *:flex-1"
                    value={field.value}
                    onValueChange={(v) => {
                      if (v) field.onChange(v as CategoryType)
                    }}
                  >
                    <ToggleGroupItem value="income">Receita</ToggleGroupItem>
                    <ToggleGroupItem value="expense">Despesa</ToggleGroupItem>
                    <ToggleGroupItem value="both">Ambos</ToggleGroupItem>
                  </ToggleGroup>
                )}
              />
              <FieldDescription>
                “Ambos” pode ser usado em lançamentos de entrada ou saída.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.type]} />
            </Field>
          </FieldGroup>

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : isEdit ? (
                <PencilIcon data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
