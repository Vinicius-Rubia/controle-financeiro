import { PencilIcon, RocketIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AccountAvatar } from "@/components/accounts/account-avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  formatRecurringLastPosted,
  recurringScheduleLabel,
} from "@/lib/recurring-ui"
import {
  paymentMethodLabel,
  transactionTypeLabel,
} from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { RecurringRule } from "@/types/recurring"

function monthKeyFromIsoDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function RecurringListTable({
  rules,
  categoryNameById,
  accountNameById,
  cardNameById,
  onEdit,
  onDelete,
  onLaunch,
}: {
  rules: RecurringRule[]
  categoryNameById: Map<string, string>
  accountNameById: Map<string, string>
  cardNameById: Map<string, string>
  onEdit: (r: RecurringRule) => void
  onDelete: (r: RecurringRule) => void
  onLaunch: (r: RecurringRule) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-muted-foreground min-w-[120px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Título
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Tipo
          </TableHead>
          <TableHead className="text-muted-foreground min-w-[160px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Periodicidade
          </TableHead>
          <TableHead className="text-muted-foreground w-[260px] min-w-[220px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Pagamento
          </TableHead>
          <TableHead className="text-muted-foreground min-w-[120px] px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Categoria
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
            Estado
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            Último lançamento
          </TableHead>
          <TableHead className="text-muted-foreground px-6 py-4 text-right text-xs font-bold uppercase tracking-wider tabular-nums">
            Valor
          </TableHead>
          <TableHead className="text-muted-foreground w-[1%] px-6 py-4 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            Ações
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r) => {
          const cat = categoryNameById.get(r.categoryId)
          const isIncome = r.type === "income"
          const alreadyLaunchedThisMonth =
            r.frequency === "monthly" &&
            !!r.lastPostedAt &&
            monthKeyFromIsoDate(r.lastPostedAt) === currentMonthKey()
          const launchDisabled = !r.active || alreadyLaunchedThisMonth
          const launchDisabledMessage = !r.active
            ? "Ative a recorrência para lançar."
            : "Esta recorrência já foi lançada neste mês. Aguarde virar o mês para lançar novamente."
          return (
            <TableRow
              key={r.id}
              className={cn(
                "border-l-4",
                isIncome
                  ? "border-l-emerald-500 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                  : "border-l-destructive bg-destructive/5 hover:bg-destructive/12 dark:hover:bg-destructive/20"
              )}
            >
              <TableCell className="max-w-[220px] px-6 py-4 font-medium">
                <div className="flex items-center gap-3">
                  <AccountAvatar
                    name={r.title}
                    logoDataUrl={r.logoDataUrl}
                    sizeClassName="size-8 shrink-0"
                    entityLabel="recorrência"
                    entityArticle="da"
                  />
                  <span className="line-clamp-2 whitespace-normal">
                    {r.title}
                  </span>
                </div>
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge variant={isIncome ? "default" : "destructive"}>
                  {transactionTypeLabel(r.type)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] px-6 py-4 text-sm">
                {recurringScheduleLabel(r)}
              </TableCell>
              <TableCell className="w-[280px] min-w-[220px] max-w-[280px] px-6 py-4 align-center">
                <Badge
                  variant="outline"
                  className="h-auto max-w-full justify-start whitespace-normal break-words py-2 leading-tight"
                >
                  {paymentMethodLabel(r.paymentMethod)}
                  {` · ${accountNameById.get(r.accountId) ?? "Conta removida"}`}
                  {r.cardId
                    ? ` · ${cardNameById.get(r.cardId) ?? "Cartão removido"}`
                    : ""}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[160px] px-6 py-4">
                <span className="line-clamp-2 whitespace-normal">
                  {cat ?? "—"}
                </span>
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge variant={r.active ? "secondary" : "outline"}>
                  {r.active ? "Ativa" : "Pausada"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                {formatRecurringLastPosted(r.lastPostedAt)}
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
                  <span>{formatCurrencyBRL(r.amount)}</span>
                </span>
              </TableCell>
              <TableCell className="px-6 py-4 text-right">
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {launchDisabled ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            disabled
                          >
                            <RocketIcon className="size-3.5" />
                            <span className="hidden sm:inline">Lançar</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{launchDisabledMessage}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 px-2"
                      title="Registrar nas movimentações"
                      onClick={() => onLaunch(r)}
                    >
                      <RocketIcon className="size-3.5" />
                      <span className="hidden sm:inline">Lançar</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(r)}
                    aria-label={`Editar ${r.title}`}
                  >
                    <PencilIcon data-icon="inline-start" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(r)}
                    aria-label={`Excluir ${r.title}`}
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
