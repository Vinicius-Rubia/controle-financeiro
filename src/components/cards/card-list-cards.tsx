import { FileTextIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountAvatar } from "@/components/accounts/account-avatar"
import { cardLedgerSummaryWithReserved } from "@/lib/card-balances"
import { formatCurrencyBRL } from "@/lib/format-currency"
import type { Card as CardModel } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { Transaction } from "@/types/transaction"

export function CardListCards({
  cards,
  transactions,
  installmentPlans,
  accountNameById,
  accountLogoById,
  onEdit,
  onDelete,
  onOpenStatements,
}: {
  cards: CardModel[]
  transactions: Transaction[]
  installmentPlans: InstallmentPlan[]
  accountNameById: Map<string, string>
  accountLogoById: Map<string, string>
  onEdit: (card: CardModel) => void
  onDelete: (card: CardModel) => void
  onOpenStatements: (card: CardModel) => void
}) {
  return (
    <ul className="flex flex-col gap-3">
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
          <li key={card.id}>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <AccountAvatar
                      name={card.name}
                      logoDataUrl={cardLogo}
                      sizeClassName="size-9"
                      entityLabel="cartão"
                      entityArticle="do"
                    />
                    <CardTitle className="text-base">{card.name}</CardTitle>
                  </div>
                  <Badge variant={card.active ? "default" : "secondary"}>
                    {card.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Conta (fatura):</span>
                  {accountLogo ? (
                    <img
                      src={accountLogo}
                      alt={accountName || "Conta da fatura"}
                      className="size-8 rounded-md object-cover border"
                    />
                  ) : (
                    <span
                      className="bg-muted inline-flex size-8 rounded-md border"
                      title={accountName || undefined}
                    />
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">Fechamento/Vencimento:</span>{" "}
                  Dia {card.closingDay} / Dia {card.dueDay}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Limite / em fatura / reservado / disp. real:
                  </span>{" "}
                  {formatCurrencyBRL(card.limit)} /{" "}
                  {formatCurrencyBRL(summary.creditOutstanding)} /{" "}
                  {formatCurrencyBRL(summary.creditReserved)} /{" "}
                  {formatCurrencyBRL(summary.creditAvailableConsideringReserved)}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onOpenStatements(card)}
                  aria-label={`Faturas ${card.name}`}
                >
                  <FileTextIcon />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(card)}
                  aria-label={`Editar cartão ${card.name}`}
                >
                  <PencilIcon />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(card)}
                  aria-label={`Excluir cartão ${card.name}`}
                >
                  <Trash2Icon />
                </Button>
              </CardFooter>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
