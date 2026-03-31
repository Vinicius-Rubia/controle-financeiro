import {
  CalendarClockIcon,
  ListChecksIcon,
  PlusIcon,
  TagsIcon,
  WalletIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { InstallmentPlanFormDialog } from "@/components/installments/installment-plan-form-dialog"
import { PlannedPaymentDeleteDialog } from "@/components/planned-payments/planned-payment-delete-dialog"
import { PlannedPaymentFormDialog } from "@/components/planned-payments/planned-payment-form-dialog"
import {
  PlannedPaymentEmptyIcon,
  PlannedPaymentListTable,
} from "@/components/planned-payments/planned-payment-list-table"
import { PlannedPaymentTransformDialog } from "@/components/planned-payments/planned-payment-transform-dialog"
import { PageIntro } from "@/components/shared/page-intro"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
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
import { useAccounts } from "@/hooks/use-accounts"
import { useCards } from "@/hooks/use-cards"
import { useCategories } from "@/hooks/use-categories"
import { useInstallmentPlans } from "@/hooks/use-installment-plans"
import { usePlannedPayments } from "@/hooks/use-planned-payments"
import { useTransactions } from "@/hooks/use-transactions"
import { formatCurrencyInputBRFromNumber } from "@/lib/currency-input"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { todayISODate } from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { PlannedPayment } from "@/types/planned-payment"

function firstDayForPlanning(item: PlannedPayment): string {
  const month = String(item.targetMonth).padStart(2, "0")
  const firstDay = `${item.targetYear}-${month}-01`
  return firstDay < todayISODate() ? todayISODate() : firstDay
}

export function PlanejamentosPage() {
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { cards } = useCards()
  const { plannedPayments, create, update, remove } = usePlannedPayments()
  const { transactions, create: createTransaction } = useTransactions()
  const { create: createInstallmentPlan } = useInstallmentPlans()

  const [formOpen, setFormOpen] = useState(false)
  const [planningToEdit, setPlanningToEdit] = useState<PlannedPayment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlannedPayment | null>(null)
  const [transformTarget, setTransformTarget] = useState<PlannedPayment | null>(null)
  const [transformOpen, setTransformOpen] = useState(false)
  const [transactionFormOpen, setTransactionFormOpen] = useState(false)
  const [installmentFormOpen, setInstallmentFormOpen] = useState(false)
  const [conversionTargetId, setConversionTargetId] = useState<string | null>(null)

  const hasCategories = categories.length > 0
  const hasAccounts = accounts.length > 0

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.id, c.name)
    return map
  }, [categories])

  const sortedItems = useMemo(
    () =>
      [...plannedPayments].sort((a, b) => {
        const byPeriod = a.targetYear - b.targetYear || a.targetMonth - b.targetMonth
        if (byPeriod !== 0) return byPeriod
        return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
      }),
    [plannedPayments]
  )
  const overview = useMemo(() => {
    const now = new Date()
    const nowKey = now.getFullYear() * 100 + (now.getMonth() + 1)
    let estimatedTotal = 0
    let estimatedIncomeTotal = 0
    let estimatedExpenseTotal = 0
    let futureCount = 0
    let pastCount = 0
    let nearestFuture: PlannedPayment | null = null

    for (const item of sortedItems) {
      const key = item.targetYear * 100 + item.targetMonth
      if (typeof item.estimatedAmount === "number") {
        estimatedTotal += item.estimatedAmount
        if (item.type === "income") estimatedIncomeTotal += item.estimatedAmount
        else estimatedExpenseTotal += item.estimatedAmount
      }
      if (key >= nowKey) {
        futureCount += 1
        if (!nearestFuture) nearestFuture = item
      } else {
        pastCount += 1
      }
    }

    return {
      totalCount: sortedItems.length,
      estimatedTotal,
      estimatedIncomeTotal,
      estimatedExpenseTotal,
      futureCount,
      pastCount,
      nearestFuture,
    }
  }, [sortedItems])

  const transactionPrefill = useMemo(() => {
    const item = sortedItems.find((i) => i.id === conversionTargetId) ?? null
    if (!item) return undefined
    return {
      title: item.title,
      type: item.type,
      categoryId: item.categoryId,
      amountFormatted:
        typeof item.estimatedAmount === "number"
          ? formatCurrencyInputBRFromNumber(item.estimatedAmount)
          : "",
    }
  }, [sortedItems, conversionTargetId])

  const installmentPrefill = useMemo(() => {
    const item = sortedItems.find((i) => i.id === conversionTargetId) ?? null
    if (!item) return undefined
    return {
      title: item.title,
      logoDataUrl: item.logoDataUrl,
      walletAccentHex: item.walletAccentHex,
      type: item.type,
      categoryId: item.categoryId,
      totalAmountFormatted:
        typeof item.estimatedAmount === "number"
          ? formatCurrencyInputBRFromNumber(item.estimatedAmount)
          : "",
      firstDueDate: firstDayForPlanning(item),
    }
  }, [sortedItems, conversionTargetId])

  const openCreate = () => {
    setPlanningToEdit(null)
    setFormOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return false
    const ok = remove(deleteTarget.id)
    if (ok) {
      toast.success("Planejamento excluído.")
    } else {
      toast.error("Não foi possível excluir o planejamento.")
    }
    return ok
  }

  const openTransformDialog = (item: PlannedPayment) => {
    setTransformTarget(item)
    setTransformOpen(true)
  }

  const consumeConvertedPlanning = () => {
    if (!conversionTargetId) return
    const ok = remove(conversionTargetId)
    if (ok) {
      toast.success("Planejamento transformado em lançamento.")
    }
    setConversionTargetId(null)
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
        <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Planejamentos
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Organize pendências futuras como em app de banco: registre o plano,
              acompanhe o que vem pela frente e transforme em lançamento no momento certo.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="font-semibold shrink-0 self-start md:self-auto"
            onClick={openCreate}
            disabled={!hasCategories}
          >
            <PlusIcon data-icon="inline-start" />
            Novo planejamento
          </Button>
        </div>
      </div>

      {!hasCategories ? (
        <Alert className="border bg-card shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-2">
            <TagsIcon className="size-4" />
            <div className="flex flex-col gap-1">
              <AlertTitle>Cadastre categorias primeiro</AlertTitle>
              <AlertDescription>
                Planejamentos precisam de categoria para conversão em lançamento.
              </AlertDescription>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={ROUTES.categorias}>Ir para Categorias</Link>
          </Button>
        </Alert>
      ) : null}

      {hasCategories && !hasAccounts ? (
        <Alert className="border bg-card shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-2">
            <WalletIcon className="size-4" />
            <div className="flex flex-col gap-1">
              <AlertTitle>Cadastre ao menos uma conta</AlertTitle>
              <AlertDescription>
                A transformação para lançamento exige uma conta de destino.
              </AlertDescription>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={ROUTES.contas}>Ir para Contas</Link>
          </Button>
        </Alert>
      ) : null}

      {hasCategories ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="from-amber-500/[0.11] to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-amber-500/15 p-2">
                <WalletIcon className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-muted-foreground px-2 py-0.5 text-xs">Estimado</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Total planejado</p>
            <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
              {formatCurrencyBRL(overview.estimatedTotal)}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/80 pt-3">
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                  Entradas
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyBRL(overview.estimatedIncomeTotal)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                  Saídas
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-destructive">
                  {formatCurrencyBRL(overview.estimatedExpenseTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="from-primary/10 to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div className="bg-primary/10 rounded-lg p-2">
                <CalendarClockIcon className="text-primary size-5" />
              </div>
              <span className="text-muted-foreground px-2 py-0.5 text-xs">Futuro</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Pendências futuras</p>
            <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
              {overview.futureCount}
            </h3>
          </div>

          <div className="from-muted/60 to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div className="bg-muted rounded-lg p-2">
                <ListChecksIcon className="text-muted-foreground size-5" />
              </div>
              <span className="text-muted-foreground px-2 py-0.5 text-xs">Todos</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Total de planos</p>
            <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
              {overview.totalCount}
            </h3>
          </div>

          <div className="from-card to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
            <p className="text-muted-foreground text-sm font-medium">Próximo planejamento</p>
            {overview.nearestFuture ? (
              <div className="mt-2 space-y-1">
                <p className="font-heading text-base font-bold truncate">
                  {overview.nearestFuture.title}
                </p>
                <p className="text-muted-foreground text-xs">
                  {String(overview.nearestFuture.targetMonth).padStart(2, "0")}/
                  {overview.nearestFuture.targetYear}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    typeof overview.nearestFuture.estimatedAmount !== "number" &&
                      "text-muted-foreground"
                  )}
                >
                  {typeof overview.nearestFuture.estimatedAmount === "number"
                    ? formatCurrencyBRL(overview.nearestFuture.estimatedAmount)
                    : "Sem valor estimado"}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                Sem pendências futuras no momento.
              </p>
            )}
            {overview.pastCount > 0 ? (
              <p className="text-muted-foreground mt-4 text-xs">
                {overview.pastCount} {overview.pastCount === 1 ? "item vencido" : "itens vencidos"}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {sortedItems.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlannedPaymentEmptyIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum planejamento cadastrado</EmptyTitle>
            <EmptyDescription>
              Registre pendências futuras para não esquecer despesas importantes, como IPVA,
              matrícula ou manutenção.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate} disabled={!hasCategories} size="lg" className="font-semibold">
              <PlusIcon data-icon="inline-start" />
              Criar planejamento
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          <PageIntro
            title="Pendências planejadas"
            description="Toque em Transformar para decidir o meio de pagamento (à vista, parcelado, cartão, etc.)."
          />
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <PlannedPaymentListTable
              items={sortedItems}
              categoryNameById={categoryNameById}
              onEdit={(item) => {
                setPlanningToEdit(item)
                setFormOpen(true)
              }}
              onDelete={setDeleteTarget}
              onTransform={openTransformDialog}
            />
          </div>
        </div>
      )}

      <PlannedPaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        planningToEdit={planningToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <PlannedPaymentDeleteDialog
        planning={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={handleDeleteConfirm}
      />

      <PlannedPaymentTransformDialog
        open={transformOpen}
        onOpenChange={(open) => {
          setTransformOpen(open)
          if (!open) setTransformTarget(null)
        }}
        planning={transformTarget}
        onChoose={(mode) => {
          if (!transformTarget) return
          setConversionTargetId(transformTarget.id)
          setTransformOpen(false)
          setTransformTarget(null)
          if (mode === "single") setTransactionFormOpen(true)
          else setInstallmentFormOpen(true)
        }}
      />

      <TransactionFormDialog
        open={transactionFormOpen}
        onOpenChange={(open) => {
          setTransactionFormOpen(open)
          if (!open) setConversionTargetId(null)
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
        transactions={transactions}
        transactionToEdit={null}
        prefill={transactionPrefill}
        onCreate={(input) => {
          createTransaction(input)
          consumeConvertedPlanning()
          setTransactionFormOpen(false)
        }}
        onUpdate={() => null}
      />

      <InstallmentPlanFormDialog
        open={installmentFormOpen}
        onOpenChange={(open) => {
          setInstallmentFormOpen(open)
          if (!open) setConversionTargetId(null)
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
        planToEdit={null}
        prefill={installmentPrefill}
        onCreate={(input) => {
          createInstallmentPlan(input)
          consumeConvertedPlanning()
          setInstallmentFormOpen(false)
        }}
        onUpdate={() => null}
      />
    </div>
  )
}
