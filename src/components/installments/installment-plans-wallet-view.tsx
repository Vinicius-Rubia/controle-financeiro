import { BanIcon, CheckIcon, MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { AccountAvatar } from "@/components/accounts/account-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cardWalletBackgroundStyle } from "@/lib/card-wallet-accent"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { paymentMethodLabel, transactionTypeLabel } from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { Installment, InstallmentPlan } from "@/types/installment"

const PLAN_SKINS = [
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
  return Math.abs(hash) % PLAN_SKINS.length
}

function paidCount(plan: InstallmentPlan): number {
  return plan.installments.filter((i) => i.status === "posted").length
}

function remainingAmount(plan: InstallmentPlan): number {
  return plan.reservedAmount
}

function installmentStatusLabel(
  i: Installment,
  paymentMethod: InstallmentPlan["paymentMethod"]
): string {
  if (i.status === "posted") return "Lançada"
  if (i.status === "cancelled") return "Cancelada"
  return paymentMethod === "credit_card" ? "Reservada" : "Em aberto"
}

function postedInstallmentLabel(
  paymentMethod: InstallmentPlan["paymentMethod"]
): string {
  return paymentMethod === "credit_card" ? "Lançada" : "Paga"
}

function remainingAmountLabel(
  paymentMethod: InstallmentPlan["paymentMethod"]
): string {
  return paymentMethod === "credit_card" ? "Reservado no limite" : "Em aberto"
}

function payButtonLabel(
  paymentMethod: InstallmentPlan["paymentMethod"]
): string {
  return paymentMethod === "credit_card" ? "Lançar na fatura" : "Registrar pagamento"
}

function formatInstallmentEventDate(isoDate: string): string {
  const normalizedISODate = isoDate.includes("T") ? isoDate.slice(0, 10) : isoDate
  return new Date(`${normalizedISODate}T00:00:00`).toLocaleDateString("pt-BR")
}

function postedEventLabel(
  paymentMethod: InstallmentPlan["paymentMethod"]
): string {
  return paymentMethod === "credit_card" ? "lançado em" : "pago em"
}

function installmentAmountLabel(installment: Installment): string {
  if (installment.status !== "posted") return formatCurrencyBRL(installment.amount)
  if (typeof installment.settledAmount !== "number")
    return formatCurrencyBRL(installment.amount)
  if (installment.settledAmount === installment.amount)
    return formatCurrencyBRL(installment.amount)
  return `${formatCurrencyBRL(installment.amount)} (pago antecipadamente com desconto: ${formatCurrencyBRL(installment.settledAmount)})`
}

function paidAmount(plan: InstallmentPlan): number {
  return plan.installments.reduce((sum, installment) => {
    if (installment.status !== "posted") return sum
    if (typeof installment.settledAmount === "number") return sum + installment.settledAmount
    return sum + installment.amount
  }, 0)
}

function savedAmount(plan: InstallmentPlan): number {
  return plan.installments.reduce((sum, installment) => {
    if (installment.status !== "posted") return sum
    if (typeof installment.settledAmount !== "number") return sum
    return sum + Math.max(0, installment.amount - installment.settledAmount)
  }, 0)
}

export function InstallmentPlansWalletView({
  plans,
  categoryNameById,
  accountNameById,
  cardNameById,
  onEdit,
  onCancel,
  onDelete,
  onPay,
}: {
  plans: InstallmentPlan[]
  categoryNameById: Map<string, string>
  accountNameById: Map<string, string>
  cardNameById: Map<string, string>
  onEdit: (plan: InstallmentPlan) => void
  onCancel: (plan: InstallmentPlan) => void
  onDelete: (plan: InstallmentPlan) => void
  onPay: (plan: InstallmentPlan, installment: Installment) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(plans[0]?.id ?? null)
  const skipNextSelectRef = useRef(false)

  useEffect(() => {
    if (plans.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !plans.some((p) => p.id === selectedId)) {
      setSelectedId(plans[0].id)
    }
  }, [plans, selectedId])

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? plans[0] ?? null,
    [plans, selectedId]
  )
  const selectedPaidAmount = useMemo(
    () => (selected ? paidAmount(selected) : 0),
    [selected]
  )
  const selectedSavedAmount = useMemo(
    () => (selected ? savedAmount(selected) : 0),
    [selected]
  )

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {plans.map((plan) => {
          const paid = paidCount(plan)
          const remaining = remainingAmount(plan)
          const isIncome = plan.type === "income"
          const isCompleted = plan.status === "completed"
          const isCancelled = plan.status === "cancelled"
          const isSelected = plan.id === selected?.id
          const skin = PLAN_SKINS[skinIndexFromId(plan.id)]
          const customBg = cardWalletBackgroundStyle(plan.walletAccentHex)
          const progress = plan.installmentCount
            ? Math.min(100, Math.round((paid / plan.installmentCount) * 100))
            : 0

          return (
            <li
              key={plan.id}
              className="w-[min(100%,300px)] shrink-0 snap-center first:pl-0 last:pr-0"
            >
              <div
                className={cn(
                  "rounded-2xl bg-white/20 p-px shadow-xl border-2 border-black/10 dark:bg-white/10 dark:border-white/10",
                  isSelected && "border-primary/60 dark:border-primary/50"
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (skipNextSelectRef.current) {
                      skipNextSelectRef.current = false
                      return
                    }
                    setSelectedId(plan.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setSelectedId(plan.id)
                    }
                  }}
                  className={cn(
                    "relative flex min-h-[220px] cursor-pointer flex-col overflow-hidden rounded-[calc(var(--radius-2xl)-1px)] p-5 text-left text-white transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    !customBg && skin,
                    (isCompleted || isCancelled) && "brightness-[0.92] saturate-75"
                  )}
                  style={customBg ?? undefined}
                >
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl"
                    aria-hidden
                  />
                  <div className="relative flex min-h-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      {!isCompleted && !isCancelled ? (
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <AccountAvatar
                            name={plan.title}
                            logoDataUrl={plan.logoDataUrl}
                            sizeClassName="size-12 shrink-0"
                            entityLabel="parcelamento"
                            entityArticle="do"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-tight">
                              {plan.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60">
                              <span>Ativo</span>
                              <span className="text-white/40">·</span>
                              <span>
                                {paid}/{plan.installmentCount} parcelas
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}
                      <Popover
                        onOpenChange={(open) => {
                          if (open) skipNextSelectRef.current = false
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="pointer-events-auto size-8 shrink-0 text-white hover:bg-white/15 hover:text-white"
                            aria-label={`Opções · ${plan.title}`}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <MoreVerticalIcon />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-48 p-1"
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
                                skipNextSelectRef.current = true
                              }}
                              onClick={() => onEdit(plan)}
                            >
                              <PencilIcon data-icon="inline-start" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="justify-start font-normal"
                              disabled={plan.status !== "active"}
                              onPointerDown={() => {
                                skipNextSelectRef.current = true
                              }}
                              onClick={() => onCancel(plan)}
                            >
                              <BanIcon data-icon="inline-start" />
                              Cancelar plano
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="justify-start font-normal text-destructive hover:text-destructive"
                              onPointerDown={() => {
                                skipNextSelectRef.current = true
                              }}
                              onClick={() => onDelete(plan)}
                            >
                              <Trash2Icon data-icon="inline-start" />
                              Excluir
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {isCompleted || isCancelled ? (
                      <div className="flex min-h-0 flex-1 items-center justify-center">
                        <div className="flex flex-col items-center text-center">
                          <AccountAvatar
                            name={plan.title}
                            logoDataUrl={plan.logoDataUrl}
                            sizeClassName="size-14 shrink-0"
                            entityLabel="parcelamento"
                            entityArticle="do"
                          />
                          <p className="mt-3 max-w-full truncate text-base font-semibold tracking-tight">
                            {plan.title}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium uppercase tracking-wider text-white/70">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1",
                                isCompleted ? "text-emerald-200" : "text-amber-200"
                              )}
                            >
                              {isCompleted ? (
                                <CheckIcon className="size-3.5" />
                              ) : (
                                <BanIcon className="size-3.5" />
                              )}
                              {isCompleted ? "Pago" : "Cancelado"}
                            </span>
                            <span className="text-white/40">·</span>
                            <span>{plan.installmentCount} parcelas</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {!isCompleted && !isCancelled ? (
                      <div className="mt-4 space-y-2">
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-white/90 transition-[width] duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                          {remainingAmountLabel(plan.paymentMethod)}
                        </p>
                        <p
                          className={cn(
                            "font-heading text-2xl font-bold tabular-nums tracking-tight",
                            isIncome ? "text-emerald-300" : "text-white"
                          )}
                        >
                          {formatCurrencyBRL(remaining)}
                        </p>
                        <p className="text-[11px] leading-snug text-white/55">
                          Total {formatCurrencyBRL(plan.totalAmount)} ·{" "}
                          {plan.installmentCount}x ·{" "}
                          {isIncome ? "Entrada" : "Despesa"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-center text-xs">
                Toque para ver as parcelas
              </p>
            </li>
          )
        })}
      </ul>

      {selected ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="border-b border-border/80 bg-muted/25 px-5 py-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Parcelas
            </p>
            <h2 className="font-heading mt-1 text-lg font-bold tracking-tight">
              {selected.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={selected.type === "income" ? "default" : "destructive"}>
                {transactionTypeLabel(selected.type)}
              </Badge>
              <Badge variant="outline" className="font-normal">
                {paymentMethodLabel(selected.paymentMethod)}
              </Badge>
              <Badge variant="outline" className="font-normal">
                {accountNameById.get(selected.accountId) ?? "Conta removida"}
                {selected.cardId
                  ? ` · ${cardNameById.get(selected.cardId) ?? "Cartão removido"}`
                  : ""}
              </Badge>
              <Badge variant="outline" className="font-normal">
                {categoryNameById.get(selected.categoryId) ?? "Categoria removida"}
              </Badge>
              <Badge variant="outline" className="font-normal">
                Total pago: {formatCurrencyBRL(selectedPaidAmount)}
              </Badge>
              <Badge variant="outline" className="font-normal text-emerald-700 dark:text-emerald-300">
                Economizado: {formatCurrencyBRL(selectedSavedAmount)}
              </Badge>
            </div>
          </div>
          <div className="divide-y divide-border/80">
            {selected.installments.map((installment) => (
              <div
                key={installment.id}
                className={cn(
                  "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
                  installment.status === "posted" && "bg-emerald-500/[0.06]",
                  installment.status === "cancelled" && "bg-amber-500/[0.06]"
                )}
              >
                <div className="min-w-0 space-y-1 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold tabular-nums">
                      {installment.number}/{selected.installmentCount}
                    </span>
                    <span className="text-muted-foreground">
                      venc.{" "}
                      {new Date(`${installment.dueDate}T00:00:00`).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                  {installment.status === "posted" && installment.postedAt ? (
                    <p className="text-muted-foreground text-xs">
                      {postedEventLabel(selected.paymentMethod)}{" "}
                      {formatInstallmentEventDate(installment.postedAt)}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {installmentAmountLabel(installment)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <Badge
                    variant={
                      installment.status === "posted" ? "secondary" : "outline"
                    }
                  >
                    {installment.status === "posted"
                      ? postedInstallmentLabel(selected.paymentMethod)
                      : installmentStatusLabel(installment, selected.paymentMethod)}
                  </Badge>
                  {installment.status === "reserved" &&
                  selected.status !== "cancelled" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="font-semibold"
                      onClick={() => onPay(selected, installment)}
                    >
                      <CheckIcon data-icon="inline-start" />
                      {payButtonLabel(selected.paymentMethod)}
                    </Button>
                  ) : installment.status === "posted" ? (
                    <span
                      className="text-emerald-600 dark:text-emerald-300"
                      title={postedInstallmentLabel(selected.paymentMethod)}
                      aria-label={postedInstallmentLabel(selected.paymentMethod)}
                    >
                      <CheckIcon className="size-4" />
                    </span>
                  ) : (
                    <span
                      className="text-amber-600 dark:text-amber-300"
                      title={
                        installment.status === "cancelled"
                          ? "Cancelada"
                          : "Plano cancelado"
                      }
                      aria-label={
                        installment.status === "cancelled"
                          ? "Cancelada"
                          : "Plano cancelado"
                      }
                    >
                      <BanIcon className="size-4" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
