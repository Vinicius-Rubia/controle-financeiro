import { PencilIcon, Trash2Icon } from "lucide-react"

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
import {
  formatTransactionDate,
  paymentMethodLabel,
  transactionCategoryDisplay,
  transactionTypeLabel,
} from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/transaction"

export function TransactionListTable({
  transactions,
  categoryNameById,
  accountNameById,
  cardNameById,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[]
  categoryNameById: Map<string, string>
  accountNameById: Map<string, string>
  cardNameById: Map<string, string>
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-muted-foreground min-w-[140px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Data
          </TableHead>
          <TableHead className="text-muted-foreground min-w-[160px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Título
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Tipo
          </TableHead>
          <TableHead className="text-muted-foreground w-[260px] min-w-[220px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Pagamento
          </TableHead>
          <TableHead className="text-muted-foreground min-w-[120px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Categoria
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-right text-xs font-bold uppercase tracking-wider tabular-nums">
            Valor
          </TableHead>
          <TableHead className="text-muted-foreground min-w-[200px] max-w-[280px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Descrição
          </TableHead>
          <TableHead className="text-muted-foreground w-[1%] px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
            Ações
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => {
          const catLabel = transactionCategoryDisplay(t, categoryNameById)
          const isIncome = t.type === "income"
          const editLocked = Boolean(t.transferGroupId)
          return (
            <TableRow
              key={t.id}
              className={cn(
                "border-l-4",
                isIncome
                  ? "border-l-emerald-500 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                  : "border-l-destructive bg-destructive/5 hover:bg-destructive/12 dark:hover:bg-destructive/20"
              )}
            >
              <TableCell className="text-muted-foreground px-6 py-4 whitespace-nowrap">
                {formatTransactionDate(t.date)}
              </TableCell>
              <TableCell className="max-w-[220px] px-6 py-4 font-medium">
                <span className="line-clamp-2 whitespace-normal">{t.title}</span>
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge variant={isIncome ? "default" : "destructive"}>
                  {transactionTypeLabel(t.type)}
                </Badge>
              </TableCell>
              <TableCell className="w-[280px] min-w-[220px] max-w-[280px] px-6 py-4 align-center">
                <Badge
                  variant="outline"
                  className="h-auto max-w-full justify-start whitespace-normal break-words py-2 leading-tight"
                >
                  {paymentMethodLabel(t.paymentMethod)}
                  {t.statementPeriodKey
                    ? ` · fecha ${formatTransactionDate(t.statementPeriodKey)}`
                    : ""}
                  {` · ${accountNameById.get(t.accountId) ?? "Conta removida"}`}
                  {t.cardId ? ` · ${cardNameById.get(t.cardId) ?? "Cartão removido"}` : ""}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[160px] px-6 py-4">
                <span className="line-clamp-2 whitespace-normal">
                  {catLabel}
                </span>
              </TableCell>
              <TableCell
                className={cn(
                  "px-6 py-4 text-right font-medium tabular-nums",
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  <span aria-hidden>{isIncome ? "+" : "−"}</span>
                  <span>{formatCurrencyBRL(t.amount)}</span>
                </span>
              </TableCell>
              <TableCell className="max-w-[280px] px-6 py-4 whitespace-normal text-muted-foreground">
                <span className="line-clamp-2 text-sm">
                  {t.description || "—"}
                </span>
              </TableCell>
              <TableCell className="px-6 py-4 text-right">
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={editLocked}
                    title={
                      editLocked
                        ? "Transferências não podem ser editadas aqui. Exclua e registre de novo."
                        : undefined
                    }
                    onClick={() => onEdit(t)}
                    aria-label={`Editar ${t.title}`}
                  >
                    <PencilIcon data-icon="inline-start" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(t)}
                    aria-label={`Excluir ${t.title}`}
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
