import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  WalletIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROUTES } from "@/constants/routes"
import { useAccounts } from "@/hooks/use-accounts"
import { useCards } from "@/hooks/use-cards"
import { useCategories } from "@/hooks/use-categories"
import { useInstallmentPlans } from "@/hooks/use-installment-plans"
import { usePlannedPayments } from "@/hooks/use-planned-payments"
import { useRecurringRules } from "@/hooks/use-recurring-rules"
import { useTransactions } from "@/hooks/use-transactions"
import {
  computeMonthlyProjection,
  type MonthlyProjectionItem,
  type MonthlyProjectionSource,
} from "@/lib/dashboard-aggregates"
import { formatCurrencyBRL } from "@/lib/format-currency"
import {
  formatTransactionDate,
  paymentMethodLabel,
} from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

function sourceLabel(source: MonthlyProjectionSource): string {
  switch (source) {
    case "recurring":
      return "Recorrência"
    case "installment":
      return "Parcelamento"
    case "credit_statement":
      return "Fatura"
    case "planned_payment":
      return "Planejamento"
    default:
      return source
  }
}

function detailLines(
  item: MonthlyProjectionItem,
  accountNameById: Map<string, string>,
  cardNameById: Map<string, string>,
  categoryNameById: Map<string, string>
): string[] {
  const lines: string[] = []

  if (item.categoryId) {
    const n = categoryNameById.get(item.categoryId)
    if (n) lines.push(`Categoria: ${n}`)
  }

  if (item.source === "credit_statement" && item.statementClosingIso) {
    lines.push(
      `Fechamento da fatura: ${formatTransactionDate(item.statementClosingIso)}`
    )
    lines.push(`Vencimento: ${formatTransactionDate(item.dueDateIso)}`)
    if (item.payFromAccountId) {
      lines.push(
        `Pagar com: ${accountNameById.get(item.payFromAccountId) ?? "Conta"}`
      )
    }
    return lines
  }

  if (item.paymentMethod) {
    lines.push(`Meio: ${paymentMethodLabel(item.paymentMethod)}`)
  }

  if (item.cardId) {
    const cn = cardNameById.get(item.cardId)
    if (cn) lines.push(`Cartão: ${cn}`)
  }

  if (item.accountId) {
    lines.push(`Conta: ${accountNameById.get(item.accountId) ?? "—"}`)
  }

  if (item.competenceIso) {
    lines.push(
      `Competência no crédito: ${formatTransactionDate(item.competenceIso)}`
    )
    lines.push(`Pagamento na fatura: ${formatTransactionDate(item.dueDateIso)}`)
  }

  if (item.source === "planned_payment") {
    lines.push(
      "Valor e data são estimativas; ajuste em Planejamentos se precisar."
    )
  }

  return lines
}

function ProjectionTable({
  items,
  variant,
  accountNameById,
  cardNameById,
  categoryNameById,
}: {
  items: MonthlyProjectionItem[]
  variant: "expense" | "income"
  accountNameById: Map<string, string>
  cardNameById: Map<string, string>
  categoryNameById: Map<string, string>
}) {
  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-muted-foreground w-[120px] px-4 py-3 text-xs font-bold uppercase tracking-wider md:px-6 md:py-4">
            Vencimento
          </TableHead>
          <TableHead className="text-muted-foreground px-4 py-3 text-xs font-bold uppercase tracking-wider md:px-6 md:py-4">
            Item
          </TableHead>
          <TableHead className="text-muted-foreground hidden min-w-[200px] px-6 py-4 text-xs font-bold uppercase tracking-wider md:table-cell">
            Detalhes
          </TableHead>
          <TableHead className="text-muted-foreground w-[120px] px-4 py-3 text-right text-xs font-bold uppercase tracking-wider md:px-6 md:py-4">
            Valor
          </TableHead>
          <TableHead className="text-muted-foreground hidden w-[110px] px-6 py-4 text-xs font-bold uppercase tracking-wider lg:table-cell">
            Origem
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const details = detailLines(
            item,
            accountNameById,
            cardNameById,
            categoryNameById
          )
          return (
            <TableRow key={item.key} className="group">
              <TableCell className="align-top px-4 py-3 font-mono text-xs tabular-nums md:px-6 md:py-4">
                {item.source === "planned_payment"
                  ? "Mês (sem dia fixo)"
                  : formatTransactionDate(
                      item.competenceIso ?? item.dueDateIso
                    )}
              </TableCell>
              <TableCell className="align-top px-4 py-3 md:px-6 md:py-4">
                <div className="font-medium">{item.title}</div>
                {item.subtitle ? (
                  <div className="text-muted-foreground text-sm">
                    {item.subtitle}
                  </div>
                ) : null}
                <ul className="text-muted-foreground mt-2 space-y-0.5 text-xs md:hidden">
                  {details.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </TableCell>
              <TableCell className="text-muted-foreground hidden align-top px-6 py-4 md:table-cell">
                <ul className="space-y-1 text-sm">
                  {details.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </TableCell>
              <TableCell
                className={cn(
                  "align-top px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums md:px-6 md:py-4",
                  variant === "expense"
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {item.amountIsKnown ? formatCurrencyBRL(item.amount) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground hidden align-top px-6 py-4 text-sm lg:table-cell">
                {sourceLabel(item.source)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function ProjectionSection({
  title,
  description,
  items,
  variant,
  accountNameById,
  cardNameById,
  categoryNameById,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  items: MonthlyProjectionItem[]
  variant: "expense" | "income"
  accountNameById: Map<string, string>
  cardNameById: Map<string, string>
  categoryNameById: Map<string, string>
  emptyTitle: string
  emptyDescription: string
}) {
  const EmptyIcon = variant === "expense" ? ArrowDownLeftIcon : ArrowUpRightIcon

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {items.length === 0 ? (
          <Empty className="border-0 bg-transparent py-12 md:py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <EmptyIcon className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ProjectionTable
            items={items}
            variant={variant}
            accountNameById={accountNameById}
            cardNameById={cardNameById}
            categoryNameById={categoryNameById}
          />
        )}
      </div>
    </section>
  )
}

export function FluxoMensalPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [periodOpen, setPeriodOpen] = useState(false)

  const { transactions } = useTransactions()
  const { cards } = useCards()
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { plans: installmentPlans } = useInstallmentPlans()
  const { rules: recurringRules } = useRecurringRules()
  const { plannedPayments } = usePlannedPayments()

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

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.name)
    return m
  }, [categories])

  const projection = useMemo(
    () =>
      computeMonthlyProjection({
        year,
        month,
        transactions,
        cards,
        installmentPlans,
        recurringRules,
        plannedPayments,
      }),
    [
      year,
      month,
      transactions,
      cards,
      installmentPlans,
      recurringRules,
      plannedPayments,
    ]
  )

  const expenses = useMemo(
    () => projection.filter((r) => r.type === "expense"),
    [projection]
  )
  const incomes = useMemo(
    () => projection.filter((r) => r.type === "income"),
    [projection]
  )

  const expenseTotalKnown = useMemo(
    () =>
      expenses.reduce(
        (acc, r) => (r.amountIsKnown ? acc + r.amount : acc),
        0
      ),
    [expenses]
  )
  const incomeTotalKnown = useMemo(
    () =>
      incomes.reduce(
        (acc, r) => (r.amountIsKnown ? acc + r.amount : acc),
        0
      ),
    [incomes]
  )

  const expenseUnknownCount = expenses.filter((r) => !r.amountIsKnown).length
  const incomeUnknownCount = incomes.filter((r) => !r.amountIsKnown).length
  const balanceKnown = incomeTotalKnown - expenseTotalKnown

  const calendarMonth = useMemo(
    () => new Date(year, month - 1, 1),
    [year, month]
  )

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
        <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Fluxo mensal
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Faturas, parcelas, recorrências e planejamentos com vencimento ou
              impacto no caixa — para organizar o que pagar em cada dia e quanto
              reservar.
            </p>
            <p className="text-primary mt-4 font-heading text-lg font-semibold capitalize tracking-tight">
              {monthLabel(year, month)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Período</Label>
              <div className="flex flex-wrap items-center gap-1">
                <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-w-[min(100%,240px)] justify-start gap-2 font-medium"
                      aria-expanded={periodOpen}
                      aria-haspopup="dialog"
                    >
                      <CalendarIcon className="size-4 shrink-0 opacity-70" />
                      <span className="capitalize">
                        {monthLabel(year, month)}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      month={calendarMonth}
                      selected={calendarMonth}
                      onMonthChange={(d) => {
                        setYear(d.getFullYear())
                        setMonth(d.getMonth() + 1)
                      }}
                      onSelect={(d) => {
                        if (!d) return
                        setYear(d.getFullYear())
                        setMonth(d.getMonth() + 1)
                        setPeriodOpen(false)
                      }}
                      captionLayout="dropdown"
                      fromYear={2000}
                      toYear={2100}
                      weekStartsOn={1}
                      showOutsideDays
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Mês anterior"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() => shiftMonth(1)}
                  aria-label="Próximo mês"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="from-destructive/10 to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-destructive/15 p-2">
              <ArrowDownLeftIcon className="text-destructive size-5" />
            </div>
            <span className="text-muted-foreground px-2 py-0.5 text-xs">
              Previsto
            </span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Saídas (valor conhecido)
          </p>
          <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight text-destructive">
            {formatCurrencyBRL(expenseTotalKnown)}
          </h3>
          {expenseUnknownCount > 0 ? (
            <p className="text-muted-foreground mt-3 border-t border-border/80 pt-3 text-xs">
              + {expenseUnknownCount}{" "}
              {expenseUnknownCount === 1 ? "item sem" : "itens sem"} valor
              estimado
            </p>
          ) : null}
        </div>

        <div className="from-emerald-500/[0.11] to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <ArrowUpRightIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-muted-foreground px-2 py-0.5 text-xs">
              Previsto
            </span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Entradas (valor conhecido)
          </p>
          <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCurrencyBRL(incomeTotalKnown)}
          </h3>
          {incomeUnknownCount > 0 ? (
            <p className="text-muted-foreground mt-3 border-t border-border/80 pt-3 text-xs">
              + {incomeUnknownCount}{" "}
              {incomeUnknownCount === 1 ? "item sem" : "itens sem"} valor
              estimado
            </p>
          ) : null}
        </div>

        <div className="from-primary/10 to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="bg-primary/10 rounded-lg p-2">
              <WalletIcon className="text-primary size-5" />
            </div>
            <span className="text-muted-foreground px-2 py-0.5 text-xs">
              Saldo
            </span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Entradas − saídas (só valores conhecidos)
          </p>
          <h3
            className={cn(
              "mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight",
              balanceKnown >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            )}
          >
            {formatCurrencyBRL(balanceKnown)}
          </h3>
          <p className="text-muted-foreground mt-3 border-t border-border/80 pt-3 text-xs">
            Itens com “—” não entram na soma.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <ProjectionSection
          title="O que deve sair no mês"
          description="Desembolsos previstos: faturas, parcelas no débito/pix, recorrências e planejamentos de saída."
          items={expenses}
          variant="expense"
          accountNameById={accountNameById}
          cardNameById={cardNameById}
          categoryNameById={categoryNameById}
          emptyTitle="Nenhuma saída prevista"
          emptyDescription="Neste mês não há fatura em aberto com vencimento aqui, parcela reservada, recorrência pendente ou planejamento de despesa."
        />
        <ProjectionSection
          title="O que deve entrar no mês"
          description="Receitas previstas: recorrências de entrada, parcelas a receber e planejamentos de entrada."
          items={incomes}
          variant="income"
          accountNameById={accountNameById}
          cardNameById={cardNameById}
          categoryNameById={categoryNameById}
          emptyTitle="Nenhuma entrada prevista"
          emptyDescription="Não há itens de entrada projetados para este mês."
        />
      </div>

      <Alert className="border bg-card shadow-sm">
        <InfoIcon className="size-4" />
        <AlertDescription className="text-muted-foreground leading-relaxed">
          Recorrências já lançadas no mês não aparecem de novo. Parcelas postadas
          na fatura somem quando deixam de estar reservadas. Itens de{" "}
          <Link
            className="text-foreground font-medium underline-offset-4 hover:underline"
            to={ROUTES.planejamentos}
          >
            Planejamentos
          </Link>{" "}
          usam o mês alvo e o valor estimado, quando houver.
        </AlertDescription>
      </Alert>
    </div>
  )
}
