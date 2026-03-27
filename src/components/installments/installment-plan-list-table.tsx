import { BanIcon, CheckIcon, ChevronDownIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AccountAvatar } from "@/components/accounts/account-avatar"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { paymentMethodLabel, transactionTypeLabel } from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { Installment, InstallmentPlan } from "@/types/installment"

function paidCount(plan: InstallmentPlan): number {
  return plan.installments.filter((i) => i.status === "posted").length
}

function remainingAmount(plan: InstallmentPlan): number {
  return plan.reservedAmount
}

function installmentStatusLabel(i: Installment, paymentMethod: InstallmentPlan["paymentMethod"]): string {
  if (i.status === "posted") return "Lançada"
  if (i.status === "cancelled") return "Cancelada"
  return paymentMethod === "credit_card" ? "Reservada" : "Em aberto"
}

function postedInstallmentLabel(paymentMethod: InstallmentPlan["paymentMethod"]): string {
  return paymentMethod === "credit_card" ? "Lançada" : "Paga"
}

function remainingAmountLabel(paymentMethod: InstallmentPlan["paymentMethod"]): string {
  return paymentMethod === "credit_card" ? "Reservado no limite" : "Em aberto"
}

function payButtonLabel(paymentMethod: InstallmentPlan["paymentMethod"]): string {
  return paymentMethod === "credit_card" ? "Lançar na fatura" : "Registrar pagamento"
}

function formatInstallmentEventDate(isoDate: string): string {
  const normalizedISODate = isoDate.includes("T") ? isoDate.slice(0, 10) : isoDate
  return new Date(`${normalizedISODate}T00:00:00`).toLocaleDateString("pt-BR")
}

function postedEventLabel(paymentMethod: InstallmentPlan["paymentMethod"]): string {
  return paymentMethod === "credit_card" ? "lançado em" : "pago em"
}

function installmentAmountLabel(installment: Installment): string {
  if (installment.status !== "posted") return formatCurrencyBRL(installment.amount)
  if (typeof installment.settledAmount !== "number") return formatCurrencyBRL(installment.amount)
  if (installment.settledAmount === installment.amount) return formatCurrencyBRL(installment.amount)
  return `${formatCurrencyBRL(installment.amount)} (pago antecipadamente com desconto: ${formatCurrencyBRL(installment.settledAmount)})`
}

export function InstallmentPlanListTable({
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
  return (
    <div className="space-y-4 px-4 py-4 sm:px-6">
      {plans.map((plan) => {
        const paid = paidCount(plan)
        const remaining = remainingAmount(plan)
        const isIncome = plan.type === "income"
        const isCompleted = plan.status === "completed"
        const isCancelled = plan.status === "cancelled"
        return (
          <div
            key={plan.id}
            className={cn(
              "rounded-lg border-l-4 border bg-card transition-colors",
              isCompleted
                ? "border-l-emerald-500 bg-emerald-500/5"
                : isCancelled
                  ? "border-l-amber-500 bg-amber-500/5"
                : isIncome
                  ? "border-l-emerald-500"
                  : "border-l-destructive"
            )}
          >
            <div className="space-y-3 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AccountAvatar
                      name={plan.title}
                      logoDataUrl={plan.logoDataUrl}
                      sizeClassName="size-12 shrink-0"
                      entityLabel="parcelamento"
                      entityArticle="do"
                    />
                    <h5 className="truncate font-semibold">
                      {plan.title}
                      {isCompleted ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckIcon className="size-3.5" />
                          Quitado
                        </span>
                      ) : isCancelled ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <BanIcon className="size-3.5" />
                          Cancelado
                        </span>
                      ) : null}
                    </h5>
                  </div>
                  <p className="text-muted-foreground text-xs mt-2">
                    {plan.installmentCount}x · Total {formatCurrencyBRL(plan.totalAmount)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-amber-600 hover:text-amber-700"
                    onClick={() => onCancel(plan)}
                    disabled={plan.status !== "active"}
                    aria-label={`Cancelar ${plan.title}`}
                  >
                    <BanIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(plan)}
                    aria-label={`Editar ${plan.title}`}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(plan)}
                    aria-label={`Excluir ${plan.title}`}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isIncome ? "default" : "destructive"}>
                  {transactionTypeLabel(plan.type)}
                </Badge>
                <Badge variant="outline">
                  {paymentMethodLabel(plan.paymentMethod)}
                  {` · ${accountNameById.get(plan.accountId) ?? "Conta removida"}`}
                  {plan.cardId
                    ? ` · ${cardNameById.get(plan.cardId) ?? "Cartão removido"}`
                    : ""}
                </Badge>
                <Badge variant="outline">
                  {categoryNameById.get(plan.categoryId) ?? "Categoria removida"}
                </Badge>
                <Badge
                  variant={
                    plan.status === "completed"
                      ? "secondary"
                      : plan.status === "cancelled"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {plan.status === "completed"
                    ? "Concluído"
                    : plan.status === "cancelled"
                      ? "Cancelado"
                      : "Ativo"}{" "}
                  · {paid}/{plan.installmentCount}
                </Badge>
                <span
                  className={cn(
                    "ml-auto text-sm font-medium tabular-nums",
                    isCompleted && "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {remainingAmountLabel(plan.paymentMethod)} {formatCurrencyBRL(remaining)}
                </span>
              </div>
            </div>

            <details className="border-t">
              <summary className="text-muted-foreground flex cursor-pointer list-none items-center justify-between px-4 py-2 text-sm font-medium">
                <span>Ver parcelas</span>
                <ChevronDownIcon className="size-4" />
              </summary>
              <div className="space-y-2 px-4 pb-3">
                {plan.installments.map((installment) => (
                  <div
                    key={installment.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 transition-opacity",
                      installment.status === "posted"
                        ? "border-emerald-200 bg-emerald-500/10 opacity-70 dark:border-emerald-900/40"
                        : installment.status === "cancelled"
                          ? "border-amber-200 bg-amber-500/10 opacity-70 dark:border-amber-900/40"
                        : "bg-background"
                    )}
                  >
                    <div className="text-sm">
                      <span className="font-medium">
                        {installment.number}/{plan.installmentCount}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · vencimento{" "}
                        {new Date(`${installment.dueDate}T00:00:00`).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                      {installment.status === "posted" && installment.postedAt ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {postedEventLabel(plan.paymentMethod)}{" "}
                          {formatInstallmentEventDate(installment.postedAt)}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {" "}
                        · {installmentAmountLabel(installment)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={installment.status === "posted" ? "secondary" : "outline"}
                      >
                        {installment.status === "posted"
                          ? postedInstallmentLabel(plan.paymentMethod)
                          : installmentStatusLabel(installment, plan.paymentMethod)}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={installment.status !== "reserved" || isCancelled}
                        onClick={() => onPay(plan, installment)}
                      >
                        <CheckIcon data-icon="inline-start" />
                        {payButtonLabel(plan.paymentMethod)}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )
      })}
    </div>
  )
}
