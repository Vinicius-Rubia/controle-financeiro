import { PencilIcon, TagsIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Category } from "@/types/category"

import { CategoryTypeBadge } from "./category-type-badge"

export function CategoryListCards({
  categories,
  onEdit,
  onDelete,
}: {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-muted/30 rounded-xl border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-lg p-1.5">
            <TagsIcon className="text-primary size-4" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold">
              Lista no celular
            </p>
            <p className="text-muted-foreground text-xs">
              Mesmas informações da tabela em cartões empilhados.
            </p>
          </div>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
      {categories.map((c) => (
        <li key={c.id}>
          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader className="flex flex-col gap-2 pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold leading-snug">
                  {c.name}
                </CardTitle>
                <CategoryTypeBadge type={c.type} />
              </div>
            </CardHeader>
            <CardFooter className="flex items-center justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onEdit(c)}
                title="Editar"
                aria-label={`Editar categoria ${c.name}`}
              >
                <PencilIcon />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => onDelete(c)}
                title="Excluir"
                aria-label={`Excluir categoria ${c.name}`}
              >
                <Trash2Icon />
              </Button>
            </CardFooter>
          </Card>
        </li>
      ))}
      </ul>
    </div>
  )
}
