import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cardWalletBackgroundStyle } from "@/lib/card-wallet-accent"
import { cn } from "@/lib/utils"
import { cardLedgerSummaryWithReserved } from "@/lib/card-balances"
import {
  creditPurchasesInCycle,
  currentOpenStatementClosingIso,
  cycleOutstanding,
} from "@/lib/credit-statement"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { todayISODate } from "@/lib/transaction-ui"
import type { Card as CardModel } from "@/types/card"
import type { InstallmentPlan } from "@/types/installment"
import type { Transaction } from "@/types/transaction"

const CARD_SKINS = [
  "bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950",
  "bg-gradient-to-br from-indigo-600 via-violet-800 to-slate-950",
  "bg-gradient-to-br from-emerald-700 via-teal-900 to-slate-950",
  "bg-gradient-to-br from-rose-600 via-red-900 to-slate-950",
  "bg-gradient-to-br from-amber-600 via-orange-900 to-slate-950",
  "bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950",
]

function skinIndexFromId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % CARD_SKINS.length
}

export function CardWalletView({
  cards,
  transactions,
  installmentPlans,
  accountNameById,
  onOpenStatement,
  onEdit,
  onDelete,
}: {
  cards: CardModel[]
  transactions: Transaction[]
  installmentPlans: InstallmentPlan[]
  accountNameById: Map<string, string>
  onOpenStatement: (card: CardModel) => void
  onEdit: (card: CardModel) => void
  onDelete: (card: CardModel) => void
}) {
  const todayIso = todayISODate()
  /** Evita abrir a fatura quando o clique “vaza” do Popover ao fechar (portal). */
  const skipNextCardActivateRef = useRef(false)

  return (
    <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {cards.map((card) => {
        const summary = cardLedgerSummaryWithReserved(
          card,
          transactions,
          installmentPlans
        )
        const currentClosing = currentOpenStatementClosingIso(
          todayIso,
          card.closingDay
        )
        const currentInvoice = cycleOutstanding(
          transactions,
          card,
          currentClosing
        )
        const currentCycleItemCount = creditPurchasesInCycle(
          transactions,
          card.id,
          card.closingDay,
          currentClosing
        ).length
        const customBg = cardWalletBackgroundStyle(card.walletAccentHex)
        const skin = CARD_SKINS[skinIndexFromId(card.id)]
        const accountName =
          accountNameById.get(card.accountId)?.trim() || "Conta da fatura"

        return (
          <li
            key={card.id}
            className="w-[min(100%,320px)] shrink-0 snap-center first:pl-0 last:pr-0"
          >
            <div className="rounded-2xl bg-white/20 p-px shadow-xl ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (skipNextCardActivateRef.current) {
                    skipNextCardActivateRef.current = false
                    return
                  }
                  onOpenStatement(card)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpenStatement(card)
                  }
                }}
                className={cn(
                  "relative flex min-h-[248px] cursor-pointer flex-col overflow-hidden rounded-[calc(var(--radius-2xl)-1px)] p-5 text-left text-white transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !customBg && skin
                )}
                style={customBg ?? undefined}
              >
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl"
                aria-hidden
              />
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {card.logoDataUrl ? (
                      <img
                        src={card.logoDataUrl}
                        alt=""
                        className="size-9 shrink-0 rounded-lg border border-white/20 bg-white/40 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight">
                        {card.name}
                      </p>
                      {!card.active ? (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                          Inativo
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Popover
                    onOpenChange={(open) => {
                      if (open) skipNextCardActivateRef.current = false
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="pointer-events-auto size-8 shrink-0 text-white hover:bg-white/15 hover:text-white"
                        aria-label={`Opções · ${card.name}`}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <MoreVerticalIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-44 p-1"
                      align="end"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onPointerDown={() => {
                            skipNextCardActivateRef.current = true
                          }}
                          onClick={() => onEdit(card)}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Editar cartão
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal text-destructive hover:text-destructive"
                          onPointerDown={() => {
                            skipNextCardActivateRef.current = true
                          }}
                          onClick={() => onDelete(card)}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Excluir
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="mt-4 flex flex-1 flex-col justify-center gap-3 text-[11px] leading-tight">
                  <div>
                    <p className="text-white/55">Conta da fatura</p>
                    <p className="truncate text-sm font-medium">{accountName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-white/55">Limite</p>
                      <p className="font-semibold tabular-nums">
                        {formatCurrencyBRL(card.limit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/55">Itens na fatura</p>
                      <p className="font-semibold tabular-nums text-white/90">
                        {currentCycleItemCount === 0
                          ? "Nenhum"
                          : currentCycleItemCount === 1
                            ? "1 lançamento"
                            : `${currentCycleItemCount} lançamentos`}
                      </p>
                    </div>
                  </div>
                  <p className="text-white/70 tabular-nums">
                    Fechamento dia {card.closingDay} · Vencimento dia{" "}
                    {card.dueDay}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-[11px] leading-tight">
                  <div>
                    <p className="text-white/55">Fatura atual</p>
                    <p className="font-semibold tabular-nums">
                      {formatCurrencyBRL(currentInvoice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/55">Disponível</p>
                    <p className="font-semibold tabular-nums">
                      {formatCurrencyBRL(
                        summary.creditAvailableConsideringReserved
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </div>
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Toque para abrir a fatura
            </p>
          </li>
        )
      })}
    </ul>
  )
}
