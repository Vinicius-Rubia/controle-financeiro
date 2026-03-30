import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { accountKindLabel, accountNetBalance } from "@/lib/account-ui"
import { cardWalletBackgroundStyle } from "@/lib/card-wallet-accent"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type { Account } from "@/types/account"
import type { Transaction } from "@/types/transaction"

const ACCOUNT_SKINS = [
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
  return Math.abs(hash) % ACCOUNT_SKINS.length
}

export function AccountWalletView({
  accounts,
  transactions,
  onOpenAccount,
  onEdit,
  onDelete,
}: {
  accounts: Account[]
  transactions: Transaction[]
  onOpenAccount: (account: Account) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}) {
  const skipNextAccountActivateRef = useRef(false)

  return (
    <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {accounts.map((account) => {
        const bal = accountNetBalance(transactions, account.id)
        const customBg = cardWalletBackgroundStyle(account.walletAccentHex)
        const skin = ACCOUNT_SKINS[skinIndexFromId(account.id)]
        const balClass =
          bal < 0
            ? "text-rose-500"
            : bal > 0
              ? "text-emerald-400"
              : "text-white/90"

        return (
          <li
            key={account.id}
            className="w-[min(100%,320px)] shrink-0 snap-center first:pl-0 last:pr-0"
          >
            <div className="rounded-2xl bg-white/20 p-px shadow-xl ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (skipNextAccountActivateRef.current) {
                    skipNextAccountActivateRef.current = false
                    return
                  }
                  onOpenAccount(account)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpenAccount(account)
                  }
                }}
                className={cn(
                  "relative flex min-h-[248px] cursor-pointer flex-col overflow-hidden rounded-[calc(var(--radius-2xl)-1px)] p-5 text-left text-white transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !customBg && skin,
                  !account.active && "brightness-[0.92] saturate-75"
                )}
                style={customBg ?? undefined}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {account.logoDataUrl ? (
                        <img
                          src={account.logoDataUrl}
                          alt=""
                          className="size-9 shrink-0 rounded-lg border border-white/20 bg-white/40 object-cover"
                        />
                      ) : (
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-xs font-bold uppercase tracking-tight text-white/90"
                          aria-hidden
                        >
                          {account.name
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight">
                          {account.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {!account.active ? (
                            <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                              Inativa
                            </span>
                          ) : null}
                          <p className="truncate text-[11px] text-white/55">
                            {accountKindLabel(account.kind)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Popover
                      onOpenChange={(open) => {
                        if (open) skipNextAccountActivateRef.current = false
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="pointer-events-auto size-8 shrink-0 text-white hover:bg-white/15 hover:text-white"
                          aria-label={`Opções · ${account.name}`}
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
                              skipNextAccountActivateRef.current = true
                            }}
                            onClick={() => onEdit(account)}
                          >
                            <PencilIcon data-icon="inline-start" />
                            Editar conta
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-start font-normal text-destructive hover:text-destructive"
                            onPointerDown={() => {
                              skipNextAccountActivateRef.current = true
                            }}
                            onClick={() => onDelete(account)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Excluir
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="mt-6 flex flex-1 flex-col justify-center gap-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                      Saldo no caixa
                    </p>
                    <p
                      className={cn(
                        "font-heading text-2xl font-bold tabular-nums tracking-tight",
                        balClass
                      )}
                    >
                      {formatCurrencyBRL(bal)}
                    </p>
                    <p className="mt-2 text-[11px] leading-snug text-white/60">
                      Pix, espécie e liquidações imediatas. Compras no crédito
                      entram na fatura do cartão.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Toque para ver o extrato no caixa
            </p>
          </li>
        )
      })}
    </ul>
  )
}
