import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarClockIcon, PencilIcon, RocketIcon, Trash2Icon } from "lucide-react"

import { AccountAvatar } from "@/components/accounts/account-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type { PlannedPayment } from "@/types/planned-payment"
import { transactionTypeLabel } from "@/lib/transaction-ui"
import { normalizeWalletAccentHex } from "@/lib/card-wallet-accent"

function monthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
}

function monthRelation(year: number, month: number): "current" | "future" | "past" {
  const now = new Date()
  const nowKey = now.getFullYear() * 100 + (now.getMonth() + 1)
  const targetKey = year * 100 + month
  if (targetKey === nowKey) return "current"
  return targetKey > nowKey ? "future" : "past"
}

function stateLabel(relation: "current" | "future" | "past"): string {
  if (relation === "current") return "Pendência para este mês"
  if (relation === "future") return "Pendência futura"
  return "Pendência de período passado"
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeWalletAccentHex(hex)
  if (!normalized) return "transparent"
  const int = Number.parseInt(normalized.slice(1), 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function PlannedPaymentListTable({
  items,
  categoryNameById,
  onEdit,
  onDelete,
  onTransform,
}: {
  items: PlannedPayment[]
  categoryNameById: Map<string, string>
  onEdit: (item: PlannedPayment) => void
  onDelete: (item: PlannedPayment) => void
  onTransform: (item: PlannedPayment) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-6 py-4">Nome</TableHead>
          <TableHead className="px-6 py-4">Tipo</TableHead>
          <TableHead className="px-6 py-4">Categoria</TableHead>
          <TableHead className="px-6 py-4">Período</TableHead>
          <TableHead className="px-6 py-4">Estado</TableHead>
          <TableHead className="px-6 py-4 text-right">Valor estimado</TableHead>
          <TableHead className="px-6 py-4 text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const relation = monthRelation(item.targetYear, item.targetMonth)
          const isIncome = item.type === "income"
          const accentHex = normalizeWalletAccentHex(item.walletAccentHex ?? "")
          const nameCellBg = accentHex
            ? {
                backgroundImage: `linear-gradient(90deg, ${hexToRgba(
                  accentHex,
                  0.2
                )} 0%, ${hexToRgba(accentHex, 0.1)} 34%, transparent 78%)`,
              }
            : undefined
          return (
            <TableRow key={item.id}>
              <TableCell
                className={cn(
                  "max-w-[260px] px-6 py-4 font-medium align-middle",
                  nameCellBg && "rounded-r-xl"
                )}
                style={nameCellBg}
              >
                <div className="relative flex items-center gap-3">
                  <AccountAvatar
                    name={item.title}
                    logoDataUrl={item.logoDataUrl}
                    sizeClassName="size-8 shrink-0"
                    entityLabel="planejamento"
                    entityArticle="do"
                  />
                  <div className="space-y-1">
                    <div className="line-clamp-2">{item.title}</div>
                    {item.description.trim() ? (
                      <p className="text-muted-foreground line-clamp-1 text-xs">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge
                  variant={isIncome ? "outline" : "destructive"}
                  className={cn(
                    isIncome &&
                      "border-emerald-500/20 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                  )}
                >
                  {transactionTypeLabel(item.type)}
                </Badge>
              </TableCell>
              <TableCell className="px-6 py-4">
                {categoryNameById.get(item.categoryId) ?? "Categoria removida"}
              </TableCell>
              <TableCell className="px-6 py-4">
                <span className="text-sm">{monthLabel(item.targetYear, item.targetMonth)}</span>
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge
                  variant="outline"
                  className={cn(relation === "past" && "text-muted-foreground")}
                >
                  {stateLabel(relation)}
                </Badge>
              </TableCell>
              <TableCell className="px-6 py-4 text-right tabular-nums">
                {typeof item.estimatedAmount === "number"
                  ? formatCurrencyBRL(item.estimatedAmount)
                  : "—"}
              </TableCell>
              <TableCell className="px-6 py-4 text-right">
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 px-2"
                    onClick={() => onTransform(item)}
                  >
                    <RocketIcon className="size-3.5" />
                    <span className="hidden sm:inline">Transformar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(item)}
                    aria-label={`Editar ${item.title}`}
                  >
                    <PencilIcon data-icon="inline-start" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(item)}
                    aria-label={`Excluir ${item.title}`}
                  >
                    <Trash2Icon data-icon="inline-start" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function PlannedPaymentEmptyIcon() {
  return <CalendarClockIcon />
}
