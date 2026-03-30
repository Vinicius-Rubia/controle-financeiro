import { Link } from "react-router-dom"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ROUTES } from "@/constants/routes"
import {
  accountKindLabel,
  accountNetBalance,
  transactionAffectsCashBalance,
} from "@/lib/account-ui"
import { formatCurrencyBRL } from "@/lib/format-currency"
import {
  formatTransactionDate,
  paymentMethodLabel,
  transactionCategoryDisplay,
} from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { Account } from "@/types/account"
import type { Transaction } from "@/types/transaction"

function cashLedgerForAccount(
  transactions: Transaction[],
  accountId: string
): Transaction[] {
  return transactions
    .filter(
      (t) => t.accountId === accountId && transactionAffectsCashBalance(t)
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return a.createdAt < b.createdAt ? 1 : -1
    })
}

export function AccountDetailSheet({
  open,
  onOpenChange,
  account,
  transactions,
  categoryNameById,
  onEditAccount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
  transactions: Transaction[]
  categoryNameById: Map<string, string>
  onEditAccount: (account: Account) => void
}) {
  const ledger = useMemo(
    () => (account ? cashLedgerForAccount(transactions, account.id) : []),
    [account, transactions]
  )

  const balance = account ? accountNetBalance(transactions, account.id) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg">
        <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle className="font-heading text-xl">
            {account ? account.name : "Conta"}
          </SheetTitle>
          <SheetDescription>
            Lançamentos que alteram o saldo no caixa nesta conta (Pix, débito,
            espécie, transferências, pagamento de fatura). Compras no crédito
            aparecem na fatura do cartão.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
          {account ? (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-muted-foreground text-xs">
                {accountKindLabel(account.kind)}
                {!account.active ? " · Inativa" : ""}
              </p>
              <p className="text-muted-foreground mt-2 text-xs font-medium uppercase tracking-wider">
                Saldo no caixa
              </p>
              <p
                className={cn(
                  "font-heading text-2xl font-bold tabular-nums tracking-tight",
                  balance < 0 && "text-destructive",
                  balance > 0 && "text-emerald-600 dark:text-emerald-400",
                  balance === 0 && "text-muted-foreground"
                )}
              >
                {formatCurrencyBRL(balance)}
              </p>
            </div>
          ) : null}

          {account ? (
            <ScrollArea className="min-h-[200px] flex-1 -mx-1 px-1">
              <div className="pb-4">
                <h3 className="text-muted-foreground mb-3 text-xs font-bold uppercase tracking-wider">
                  Movimentações
                </h3>
                {ledger.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhum lançamento que movimente o caixa nesta conta.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-0 divide-y rounded-lg border bg-card">
                    {ledger.map((t) => {
                      const cat = transactionCategoryDisplay(
                        t,
                        categoryNameById
                      )
                      const isIncome = t.type === "income"
                      return (
                        <li
                          key={t.id}
                          className="flex gap-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-tight">{t.title}</p>
                            {t.description.trim() ? (
                              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                {t.description}
                              </p>
                            ) : null}
                            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                              {formatTransactionDate(t.date)}
                              {cat !== "—" ? ` · ${cat}` : ""}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              {paymentMethodLabel(t.paymentMethod)}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "shrink-0 text-right text-sm font-semibold tabular-nums",
                              isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            )}
                          >
                            {isIncome ? "+" : "−"}
                            {formatCurrencyBRL(t.amount)}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </ScrollArea>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t p-4">
          {account ? (
            <Button
              type="button"
              className="w-full"
              size="lg"
              variant="secondary"
              onClick={() => {
                onEditAccount(account)
                onOpenChange(false)
              }}
            >
              Editar conta
            </Button>
          ) : null}
          <Button asChild className="w-full" size="lg">
            <Link to={ROUTES.movimentacoes} onClick={() => onOpenChange(false)}>
              Ir para movimentações
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
