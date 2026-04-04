import { Link } from "react-router-dom"
import { BanknoteIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { CardPayStatementDialog } from "@/components/cards/card-pay-statement-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ROUTES } from "@/constants/routes"
import { creditReservedForCard } from "@/lib/card-balances"
import {
  allStatementClosingDatesForCard,
  creditPurchasesInCycle,
  currentOpenStatementClosingIso,
  settlementTransactionsInCycle,
  statementSummaryForClosing,
} from "@/lib/credit-statement"
import { formatCurrencyBRL } from "@/lib/format-currency"
import {
  formatTransactionDate,
  todayISODate,
  transactionCategoryDisplay,
} from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { Account } from "@/types/account"
import type { Card as CardModel } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { CreateTransactionInput, Transaction } from "@/types/transaction"

function cycleShortLabel(closingIso: string): string {
  const parts = closingIso.split("-").map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return closingIso
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function CardStatementSheet({
  open,
  onOpenChange,
  card,
  transactions,
  installmentPlans,
  categoryNameById,
  accounts,
  onPayStatement,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CardModel | null
  transactions: Transaction[]
  installmentPlans: InstallmentPlan[]
  categoryNameById: Map<string, string>
  accounts: Account[]
  onPayStatement: (input: CreateTransactionInput) => void
}) {
  const todayIso = todayISODate()
  const cyclesChrono = useMemo(
    () =>
      card ? allStatementClosingDatesForCard(transactions, card, todayIso) : [],
    [card, transactions, todayIso]
  )
  const cyclesNewestFirst = useMemo(
    () => [...cyclesChrono].reverse(),
    [cyclesChrono]
  )

  const [selectedClosing, setSelectedClosing] = useState<string>("")
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    if (!open || !card) return
    const current = currentOpenStatementClosingIso(todayIso, card.closingDay)
    setSelectedClosing(current)
  }, [open, card?.id, card?.closingDay, todayIso])

  useEffect(() => {
    if (!open) setPayOpen(false)
  }, [open])

  const reserved = card
    ? creditReservedForCard(installmentPlans, card.id)
    : 0

  const summary =
    card && selectedClosing
      ? statementSummaryForClosing(transactions, card, selectedClosing)
      : null

  const purchases =
    card && selectedClosing
      ? creditPurchasesInCycle(
          transactions,
          card.id,
          card.closingDay,
          selectedClosing
        )
      : []

  const settlements =
    card && selectedClosing
      ? settlementTransactionsInCycle(
          transactions,
          card.id,
          selectedClosing
        )
      : []

  const currentClosingIso = card
    ? currentOpenStatementClosingIso(todayIso, card.closingDay)
    : ""

  const paidRatio =
    summary && summary.netPurchases > 0
      ? Math.min(1, summary.paid / summary.netPurchases)
      : 0

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg">
        <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle className="font-heading text-xl">
            {card ? card.name : "Fatura"}
          </SheetTitle>
          <SheetDescription>
            Fatura por ciclo de fechamento. Use o botão abaixo para registrar o
            pagamento na conta vinculada ao cartão.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
          {card ? (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Reservado em parcelamento:
              </span>{" "}
              <span className="font-medium tabular-nums">
                {formatCurrencyBRL(reserved)}
              </span>
            </div>
          ) : null}

          {card && cyclesNewestFirst.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Período da fatura
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {cyclesNewestFirst.map((closingIso) => {
                    const isCurrent = closingIso === currentClosingIso
                    const isSel = closingIso === selectedClosing
                    return (
                      <Button
                        key={closingIso}
                        type="button"
                        size="sm"
                        variant={isSel ? "default" : "outline"}
                        className={cn(
                          "shrink-0 rounded-full",
                          !isSel && "bg-background"
                        )}
                        onClick={() => setSelectedClosing(closingIso)}
                      >
                        {cycleShortLabel(closingIso)}
                        {isCurrent ? (
                          <span className="ml-1.5 text-[10px] font-normal opacity-90">
                            atual
                          </span>
                        ) : null}
                      </Button>
                    )
                  })}
              </div>
            </div>
          ) : null}

          {card && cyclesNewestFirst.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma fatura disponível.
            </p>
          ) : null}

          {summary && card ? (
            <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Vencimento estimado
                  </p>
                  <p className="font-heading text-lg font-semibold tabular-nums">
                    {formatTransactionDate(summary.dueDateIso)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">Total da fatura</p>
                  <p className="font-heading text-2xl font-bold tabular-nums tracking-tight">
                    {formatCurrencyBRL(summary.netPurchases)}
                  </p>
                </div>
              </div>

              {summary.netPurchases > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="tabular-nums font-medium">
                      {formatCurrencyBRL(summary.paid)}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-[width]"
                      style={{ width: `${paidRatio * 100}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Em aberto</p>
                  <p
                    className={cn(
                      "font-semibold tabular-nums",
                      summary.outstanding > 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatCurrencyBRL(summary.outstanding)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fechamento</p>
                  <p className="font-semibold tabular-nums">
                    {formatTransactionDate(summary.closingDateIso)}
                  </p>
                </div>
              </div>

              {summary.outstanding > 0 ? (
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={() => setPayOpen(true)}
                >
                  <BanknoteIcon data-icon="inline-start" />
                  Pagar fatura
                </Button>
              ) : null}
            </div>
          ) : null}

          {card && summary ? (
            <ScrollArea className="min-h-[200px] flex-1 -mx-1 px-1">
              <div className="space-y-6 pb-4">
                <section>
                  <h3 className="text-muted-foreground mb-3 text-xs font-bold uppercase tracking-wider">
                    Lançamentos
                  </h3>
                  {purchases.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhuma compra neste ciclo.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-0 divide-y rounded-lg border bg-card">
                      {purchases.map((t) => {
                        const cat = transactionCategoryDisplay(
                          t,
                          categoryNameById
                        )
                        const isExpense = t.type === "expense"
                        return (
                          <li
                            key={t.id}
                            className="flex gap-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium leading-tight">
                                {t.title}
                              </p>
                              {t.description.trim() ? (
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                  {t.description}
                                </p>
                              ) : null}
                              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                                {formatTransactionDate(t.date)}
                                {cat !== "—" ? ` · ${cat}` : ""}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "shrink-0 text-right text-sm font-semibold tabular-nums",
                                isExpense
                                  ? "text-foreground"
                                  : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              {isExpense ? "" : "−"}
                              {formatCurrencyBRL(t.amount)}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>

                {settlements.length > 0 ? (
                  <section>
                    <h3 className="text-muted-foreground mb-3 text-xs font-bold uppercase tracking-wider">
                      Pagamentos da fatura
                    </h3>
                    <ul className="flex flex-col gap-0 divide-y rounded-lg border bg-card">
                      {settlements.map((t) => (
                        <li
                          key={t.id}
                          className="flex gap-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-tight">
                              {t.title || "Pagamento de fatura"}
                            </p>
                            {t.description.trim() ? (
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                {t.description}
                              </p>
                            ) : null}
                            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                              {formatTransactionDate(t.date)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            −{formatCurrencyBRL(t.amount)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </ScrollArea>
          ) : null}
        </div>

        <div className="mt-auto border-t p-4">
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link to={ROUTES.movimentacoes} onClick={() => onOpenChange(false)}>
              Ver entradas e saídas
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <CardPayStatementDialog
      open={payOpen}
      onOpenChange={setPayOpen}
      card={card}
      closingIso={selectedClosing}
      transactions={transactions}
      accounts={accounts}
      onConfirm={onPayStatement}
    />
    </>
  )
}
