import { CreditCardIcon, PlusIcon, TagsIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { InstallmentPayDialog } from "@/components/installments/installment-pay-dialog"
import { InstallmentPlanCancelDialog } from "@/components/installments/installment-plan-cancel-dialog"
import { InstallmentPlanDeleteDialog } from "@/components/installments/installment-plan-delete-dialog"
import { InstallmentPlanFormDialog } from "@/components/installments/installment-plan-form-dialog"
import { InstallmentPlansWalletView } from "@/components/installments/installment-plans-wallet-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ROUTES } from "@/constants/routes"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import { useAccounts } from "@/hooks/use-accounts"
import { useCards } from "@/hooks/use-cards"
import { useCategories } from "@/hooks/use-categories"
import { useInstallmentPlans } from "@/hooks/use-installment-plans"
import type { Installment, InstallmentPlan } from "@/types/installment"

export function ParceladasPage() {
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { cards } = useCards()
  const { plans, create, update, remove, cancel, payInstallment } =
    useInstallmentPlans()

  const [formOpen, setFormOpen] = useState(false)
  const [planToEdit, setPlanToEdit] = useState<InstallmentPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InstallmentPlan | null>(null)
  const [cancelTarget, setCancelTarget] = useState<InstallmentPlan | null>(null)
  const [payTarget, setPayTarget] = useState<{
    plan: InstallmentPlan
    installment: Installment
  } | null>(null)

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.name)
    return m
  }, [categories])

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) m.set(a.id, a.name)
    return m
  }, [accounts])

  const cardNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cards) m.set(c.id, c.name)
    return m
  }, [cards])

  const hasCategories = categories.length > 0
  const hasAccounts = accounts.length > 0

  const sortedPlans = useMemo(() => {
    const statusOrder = { active: 0, completed: 1, cancelled: 2 } as const
    return [...plans].sort((a, b) => {
      const d = statusOrder[a.status] - statusOrder[b.status]
      if (d !== 0) return d
      return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
    })
  }, [plans])

  const installmentSummary = useMemo(() => {
    let totalReserved = 0
    let activeCount = 0
    let totalPaid = 0
    let totalSaved = 0
    let openInstallments = 0
    let totalPlans = sortedPlans.length
    let nextDue: {
      date: string
      amount: number
      planTitle: string
      installmentNumber: number
      installmentCount: number
    } | null = null
    for (const p of sortedPlans) {
      if (p.status === "active") {
        activeCount += 1
        totalReserved += p.reservedAmount
      }
      for (const i of p.installments) {
        if (i.status === "posted") {
          const paidAmount =
            typeof i.settledAmount === "number" ? i.settledAmount : i.amount
          totalPaid += paidAmount
          totalSaved += Math.max(0, i.amount - paidAmount)
          continue
        }
        if (i.status !== "reserved") continue
        openInstallments += 1
        if (p.status !== "active") continue
        if (
          nextDue === null ||
          i.dueDate < nextDue.date ||
          (i.dueDate === nextDue.date && i.number < nextDue.installmentNumber)
        ) {
          nextDue = {
            date: i.dueDate,
            amount: i.amount,
            planTitle: p.title,
            installmentNumber: i.number,
            installmentCount: p.installmentCount,
          }
        }
      }
    }
    return {
      totalReserved,
      activeCount,
      totalPaid,
      totalSaved,
      openInstallments,
      totalPlans,
      nextDue,
    }
  }, [sortedPlans])

  const openCreate = () => {
    setPlanToEdit(null)
    setFormOpen(true)
  }

  const confirmDelete = (): boolean => {
    if (!deleteTarget) return false
    try {
      const ok = remove(deleteTarget.id)
      if (ok) toast.success("Parcelamento excluído.")
      else toast.error("Não foi possível excluir.")
      return ok
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.")
      return false
    }
  }

  const confirmPay = (dateISO: string, settledAmount?: number) => {
    if (!payTarget) return
    const isCreditPayment = payTarget.plan.paymentMethod === "credit_card"
    try {
      payInstallment(payTarget.plan.id, payTarget.installment.id, dateISO, settledAmount)
      toast.success(
        isCreditPayment ? "Parcela lançada na fatura." : "Pagamento da parcela registrado."
      )
      setPayTarget(null)
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : isCreditPayment
            ? "Não foi possível lançar parcela na fatura."
            : "Não foi possível registrar o pagamento da parcela."
      )
    }
  }

  const confirmCancel = (): boolean => {
    if (!cancelTarget) return false
    try {
      cancel(cancelTarget.id)
      toast.success("Parcelamento cancelado.")
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar.")
      return false
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            Parcelamentos
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Visualize como no app do banco: deslize entre os planos, acompanhe o
            que falta pagar e registre cada parcela no cartão ou na conta.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="font-semibold shrink-0 self-start md:self-auto"
          disabled={!hasCategories || !hasAccounts}
          onClick={openCreate}
        >
          <PlusIcon data-icon="inline-start" />
          Novo parcelamento
        </Button>
      </div>

      {!hasCategories ? (
        <Alert className="border bg-card shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-2">
            <TagsIcon className="size-4" />
            <div className="flex flex-col gap-1">
              <AlertTitle>Cadastre categorias primeiro</AlertTitle>
              <AlertDescription>
                É necessário ter categorias para classificar os parcelamentos.
              </AlertDescription>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to={ROUTES.categorias}>Ir para categorias</Link>
          </Button>
        </Alert>
      ) : null}

      {hasCategories && !hasAccounts ? (
        <Alert className="border bg-card shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-2">
            <CreditCardIcon className="size-4" />
            <div className="flex flex-col gap-1">
              <AlertTitle>Cadastre ao menos uma conta</AlertTitle>
              <AlertDescription>
                Todo parcelamento precisa de conta para registrar os pagamentos.
              </AlertDescription>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to={ROUTES.contas}>Ir para contas</Link>
          </Button>
        </Alert>
      ) : null}

      {hasCategories && hasAccounts && sortedPlans.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCardIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum parcelamento ainda</EmptyTitle>
            <EmptyDescription>
              Crie seu primeiro plano e acompanhe parcela por parcela.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="lg" className="font-semibold" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              Criar primeiro parcelamento
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {hasCategories && hasAccounts && sortedPlans.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Pendente em planos ativos
              </p>
              <p
                className={cn(
                  "font-heading mt-1 text-3xl font-bold tabular-nums tracking-tight",
                  installmentSummary.totalReserved === 0 && "text-muted-foreground"
                )}
              >
                {formatCurrencyBRL(installmentSummary.totalReserved)}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">
                Soma do valor ainda em aberto ou reservado no limite, apenas
                parcelamentos com status ativo.
              </p>
              <div className="mt-4 grid gap-3 border-t border-border/80 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                    Já pago
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {formatCurrencyBRL(installmentSummary.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                    Economizado
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrencyBRL(installmentSummary.totalSaved)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                    Parcelas em aberto
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {installmentSummary.openInstallments}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                    Total de planos
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {installmentSummary.totalPlans}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-5 shadow-sm ring-1 ring-black/5 dark:bg-muted/15 dark:ring-white/10">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Próximo vencimento
                </p>
                <p className="font-heading mt-2 text-xl font-bold tabular-nums tracking-tight">
                  {installmentSummary.nextDue
                    ? new Date(
                        `${installmentSummary.nextDue.date}T00:00:00`
                      ).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
                {installmentSummary.nextDue ? (
                  <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                    <p className="font-medium tabular-nums text-foreground/90">
                      {formatCurrencyBRL(installmentSummary.nextDue.amount)}
                    </p>
                    <p className="truncate">{installmentSummary.nextDue.planTitle}</p>
                    <p>
                      Parcela {installmentSummary.nextDue.installmentNumber}/
                      {installmentSummary.nextDue.installmentCount}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs">
                    Sem parcelas pendentes no momento.
                  </p>
                )}
              </div>
              <div className="border-t border-border/80 pt-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Planos ativos
                </p>
                <p className="font-heading mt-1 text-2xl font-bold tabular-nums">
                  {installmentSummary.activeCount}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight">
              Seus parcelamentos
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Cada cartão mostra progresso e o valor pendente; as parcelas
              aparecem abaixo do plano selecionado.
            </p>
            <div className="mt-5">
              <InstallmentPlansWalletView
                plans={sortedPlans}
                categoryNameById={categoryNameById}
                accountNameById={accountNameById}
                cardNameById={cardNameById}
                onEdit={(plan) => {
                  setPlanToEdit(plan)
                  setFormOpen(true)
                }}
                onCancel={setCancelTarget}
                onDelete={setDeleteTarget}
                onPay={(plan, installment) => setPayTarget({ plan, installment })}
              />
            </div>
          </div>
        </div>
      ) : null}

      <InstallmentPlanFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setPlanToEdit(null)
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
        planToEdit={planToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <InstallmentPlanDeleteDialog
        plan={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />

      <InstallmentPlanCancelDialog
        plan={cancelTarget}
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
        onConfirm={confirmCancel}
      />

      <InstallmentPayDialog
        open={payTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null)
        }}
        plan={payTarget?.plan ?? null}
        installment={payTarget?.installment ?? null}
        onConfirm={confirmPay}
      />
    </div>
  )
}
