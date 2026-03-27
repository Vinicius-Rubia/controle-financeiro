import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ROUTES } from "@/constants/routes"
import { creditReservedForCard } from "@/lib/card-balances"
import { statementSummariesForCard } from "@/lib/credit-statement"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { formatTransactionDate } from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { Card as CardModel } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { Transaction } from "@/types/transaction"

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span
        className={cn(
          "text-sm font-medium tabular-nums tracking-tight",
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function CardStatementSheet({
  open,
  onOpenChange,
  card,
  transactions,
  installmentPlans,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CardModel | null
  transactions: Transaction[]
  installmentPlans: InstallmentPlan[]
}) {
  const rows = card ? statementSummariesForCard(transactions, card) : []
  const displayRows = [...rows].reverse()
  const reserved = card
    ? creditReservedForCard(installmentPlans, card.id)
    : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-full flex-col gap-4 sm:max-w-md md:max-w-lg">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle>
            {card ? `Faturas · ${card.name}` : "Faturas"}
          </SheetTitle>
          <SheetDescription>
            Por ciclo de fechamento. Registre o pagamento em Entradas/Saídas com
            o meio &quot;Pagamento de fatura&quot;.
          </SheetDescription>
        </SheetHeader>

        {card && rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma movimentação no crédito para este cartão ainda.
          </p>
        ) : null}

        {card ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Reservado em parcelamento:</span>{" "}
            <span className="font-medium tabular-nums">
              {formatCurrencyBRL(reserved)}
            </span>
          </div>
        ) : null}

        {card && displayRows.length > 0 ? (
          <ScrollArea className="min-h-0 flex-1 -mx-1 px-1">
            <ol className="flex flex-col gap-3 pb-1">
              {displayRows.map((r, index) => (
                <li key={r.closingDateIso}>
                  <Card size="sm" className="shadow-none ring-0 border">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-3">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                          Ciclo {displayRows.length - index}
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground block text-xs">
                              Fechamento
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatTransactionDate(r.closingDateIso)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs">
                              Vencimento
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatTransactionDate(r.dueDateIso)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="border-t pt-3">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Metric
                          label="Compras no ciclo"
                          value={formatCurrencyBRL(r.netPurchases)}
                        />
                        <Metric
                          label="Pago"
                          value={formatCurrencyBRL(r.paid)}
                        />
                        <Metric
                          label="Em aberto"
                          value={formatCurrencyBRL(r.outstanding)}
                          valueClassName={
                            r.outstanding > 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </ScrollArea>
        ) : null}

        <Button asChild className="w-full self-stretch mt-auto" size="lg">
          <Link to={ROUTES.movimentacoes} onClick={() => onOpenChange(false)}>
            Ir para lançamentos
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  )
}
