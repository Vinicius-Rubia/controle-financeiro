import { PencilIcon, Trash2Icon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROUTES } from "@/constants/routes"
import type { Category } from "@/types/category"

import { CategoryTypeBadge } from "./category-type-badge"

export function CategoryListTable({
  categories,
  onEdit,
  onDelete,
}: {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="bg-muted/30 border-b px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-heading font-bold">Todas as categorias</h4>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Nome, escopo de uso e ações. Ordenadas alfabeticamente.
            </p>
          </div>
          <Button variant="link" className="text-primary h-auto shrink-0 p-0" asChild>
            <Link to={ROUTES.movimentacoes}>Ver movimentações</Link>
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Nome
            </TableHead>
            <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Tipo
            </TableHead>
            <TableHead className="text-muted-foreground w-[1%] px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.id} className="group">
              <TableCell className="px-6 py-4 font-medium whitespace-normal">
                {c.name}
              </TableCell>
              <TableCell className="px-6 py-4">
                <CategoryTypeBadge type={c.type} />
              </TableCell>
              <TableCell className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="opacity-80 group-hover:opacity-100"
                    onClick={() => onEdit(c)}
                    title="Editar"
                    aria-label={`Editar categoria ${c.name}`}
                  >
                    <PencilIcon data-icon="inline-start" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive opacity-80 group-hover:opacity-100"
                    onClick={() => onDelete(c)}
                    title="Excluir"
                    aria-label={`Excluir categoria ${c.name}`}
                  >
                    <Trash2Icon data-icon="inline-start" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
