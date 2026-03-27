import { FileTextIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AccountAvatar } from "@/components/accounts/account-avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cardLedgerSummaryWithReserved } from "@/lib/card-balances"
import { formatCurrencyBRL } from "@/lib/format-currency"
import type { Card } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { Transaction } from "@/types/transaction"

export function CardListTable({
  cards,
  transactions,
  installmentPlans,
  accountNameById,
  accountLogoById,
  onEdit,
  onDelete,
  onOpenStatements,
}: {
  cards: Card[]
  transactions: Transaction[]
  installmentPlans: InstallmentPlan[]
  accountNameById: Map<string, string>
  accountLogoById: Map<string, string>
  onEdit: (card: Card) => void
  onDelete: (card: Card) => void
  onOpenStatements: (card: Card) => void
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Cartão
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Conta (fatura)
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Fechamento / Vencimento
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Limite / dívida / disp.
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Status
            </TableHead>
            <TableHead className="w-[1%] px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => {
            const summary = cardLedgerSummaryWithReserved(
              card,
              transactions,
              installmentPlans
            )
            const cardLogo = card.logoDataUrl
            const accountLogo = accountLogoById.get(card.accountId) ?? ""
            const accountName = accountNameById.get(card.accountId) ?? ""
            return (
              <TableRow key={card.id}>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AccountAvatar
                      name={card.name}
                      logoDataUrl={cardLogo}
                      sizeClassName="size-8"
                      entityLabel="cartão"
                      entityArticle="do"
                    />
                    <span className="font-medium">{card.name}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AccountAvatar
                      name={accountName || "Conta da fatura"}
                      logoDataUrl={accountLogo}
                      sizeClassName="size-8"
                      entityLabel="conta"
                      entityArticle="da"
                    />
                    <span className="font-medium">{accountName}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 tabular-nums">
                  Dia {card.closingDay} / Dia {card.dueDay}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm tabular-nums">
                  <div className="flex flex-col gap-0.5">
                    <span>Lim. {formatCurrencyBRL(card.limit)}</span>
                    <span className="text-muted-foreground">
                      Aberto {formatCurrencyBRL(summary.creditOutstanding)}
                    </span>
                    <span className="text-muted-foreground">
                      Reservado {formatCurrencyBRL(summary.creditReserved)}
                    </span>
                    <span className="text-muted-foreground">
                      Disp. real{" "}
                      {formatCurrencyBRL(summary.creditAvailableConsideringReserved)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant={card.active ? "default" : "secondary"}>
                    {card.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onOpenStatements(card)}
                      aria-label={`Faturas ${card.name}`}
                    >
                      <FileTextIcon data-icon="inline-start" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(card)}
                      aria-label={`Editar cartão ${card.name}`}
                    >
                      <PencilIcon data-icon="inline-start" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(card)}
                      aria-label={`Excluir cartão ${card.name}`}
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
    </div>
  )
}
