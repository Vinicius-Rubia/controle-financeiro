import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BarChart3Icon,
  CreditCard,
  Plus,
  WalletIcon,
} from "lucide-react"
import { useId, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROUTES } from "@/constants/routes"
import {
  computeCategorySlices,
  computeDashboardTotals,
  computeDashboardTotalsScoped,
  computeMonthlyFlow,
  computeUpcomingPendenciesNext7Days,
  resolveDistributionMode,
  totalCreditDebtAllCards,
} from "@/lib/dashboard-aggregates"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { useCards } from "@/hooks/use-cards"
import { useCategories } from "@/hooks/use-categories"
import { useInstallmentPlans } from "@/hooks/use-installment-plans"
import { useRecurringRules } from "@/hooks/use-recurring-rules"
import { useTransactions } from "@/hooks/use-transactions"
import { formatTransactionDate, transactionTypeLabel } from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"

const flowChartConfig = {
  income: {
    label: "Entradas",
    color: "var(--finance-income)",
  },
  expense: {
    label: "Saídas",
    color: "var(--finance-expense)",
  },
} satisfies ChartConfig

function currencyTooltipFormatter(value: unknown) {
  return formatCurrencyBRL(Number(value))
}

function flowTooltipFormatter(
  value: unknown,
  name: unknown,
  item: { color?: string; payload?: { fill?: string } } | undefined
) {
  const indicatorColor = item?.color ?? item?.payload?.fill ?? "currentColor"
  const label =
    name === "income"
      ? "Entradas"
      : name === "expense"
        ? "Saídas"
        : String(name)

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: indicatorColor }}
        />
        {label}
      </span>
      <span className="font-mono font-medium text-foreground tabular-nums">
        {formatCurrencyBRL(Number(value))}
      </span>
    </div>
  )
}

function formatMoMPct(prev: number, next: number): string | null {
  if (prev === 0 && next === 0) return null
  if (prev === 0) return next > 0 ? "+100%" : next < 0 ? "-100%" : null
  const p = ((next - prev) / Math.abs(prev)) * 100
  const rounded = Math.round(p * 10) / 10
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}%`
}

interface MonthlyTableRow {
  period: string
  label: string
  income: number
  expense: number
  balance: number
  balanceMoMPct: number | null
}

export function DashboardPage() {
  const chartGradId = useId().replace(/:/g, "")
  const { categories } = useCategories()
  const { cards } = useCards()
  const { transactions } = useTransactions()
  const { plans } = useInstallmentPlans()
  const { rules } = useRecurringRules()

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.name)
    return m
  }, [categories])

  const totals = useMemo(
    () => computeDashboardTotals(transactions),
    [transactions]
  )

  const cashTotals = useMemo(
    () => computeDashboardTotalsScoped(transactions, "cash"),
    [transactions]
  )

  const creditDebtTotal = useMemo(
    () => totalCreditDebtAllCards(cards, transactions),
    [cards, transactions]
  )

  const monthlyFlow = useMemo(
    () => computeMonthlyFlow(transactions),
    [transactions]
  )

  const distributionMode = useMemo(
    () => resolveDistributionMode(transactions),
    [transactions]
  )

  const categorySlices = useMemo(
    () =>
      computeCategorySlices(
        transactions,
        categoryNameById,
        distributionMode,
        5
      ),
    [transactions, categoryNameById, distributionMode]
  )

  const categoryPieChartConfig = useMemo((): ChartConfig => {
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ]

    const cfg = {} as ChartConfig
    categorySlices.forEach((row, i) => {
      cfg[row.key] = { label: row.name, color: colors[i % colors.length] }
    })

    return cfg
  }, [categorySlices])

  const categoryPieData = useMemo(() => {
    return categorySlices.map((row) => ({
      category: row.key,
      value: row.value,
      fill: `var(--color-${row.key})`,
      color: `var(--color-${row.key})`,
    }))
  }, [categorySlices])

  const upcomingPendencies = useMemo(
    () => computeUpcomingPendenciesNext7Days(transactions, cards, plans, rules),
    [transactions, cards, plans, rules]
  )

  const upcomingPendenciesTotals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const row of upcomingPendencies) {
      if (row.type === "income") income += row.amount
      else expense += row.amount
    }
    return { income, expense }
  }, [upcomingPendencies])

  const averageMonthlySpend = useMemo(() => {
    const n = monthlyFlow.length
    if (n === 0) return 0
    return totals.totalExpense / n
  }, [monthlyFlow.length, totals.totalExpense])

  const incomeExpenseMoM = useMemo(() => {
    if (monthlyFlow.length < 2) {
      return { incomePct: null as string | null, expensePct: null as string | null }
    }
    const a = monthlyFlow[monthlyFlow.length - 2]
    const b = monthlyFlow[monthlyFlow.length - 1]
    return {
      incomePct: formatMoMPct(a.income, b.income),
      expensePct: formatMoMPct(a.expense, b.expense),
    }
  }, [monthlyFlow])

  const tableRows = useMemo((): MonthlyTableRow[] => {
    const enriched = monthlyFlow.map((m, i) => {
      const balance = m.income - m.expense
      const prev = monthlyFlow[i - 1]
      const prevBalance = prev ? prev.income - prev.expense : null
      let balanceMoMPct: number | null = null
      if (prev) {
        if (prevBalance !== 0) {
          balanceMoMPct = ((balance - prevBalance!) / Math.abs(prevBalance!)) * 100
        } else if (balance !== 0) {
          balanceMoMPct = balance > 0 ? 100 : -100
        }
      }
      return {
        period: m.period,
        label: m.label,
        income: m.income,
        expense: m.expense,
        balance,
        balanceMoMPct,
      }
    })
    return [...enriched].reverse().slice(0, 12)
  }, [monthlyFlow])

  const hasTransactions = transactions.length > 0
  const hasMonthlyFlow = monthlyFlow.length > 0

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
        <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Relatórios financeiros
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Análise do seu fluxo de caixa com base nos lançamentos (dados
              locais).
            </p>
          </div>
          <Button size="lg" className="font-semibold" asChild>
            <Link to={ROUTES.movimentacoes}>
              <Plus data-icon="inline-start" />
              Novo lançamento
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <div className="bg-card rounded-xl border p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <ArrowUpRightIcon className="size-5 text-emerald-500" />
            </div>
            {incomeExpenseMoM.incomePct ? (
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  incomeExpenseMoM.incomePct.startsWith("-")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {incomeExpenseMoM.incomePct}
              </span>
            ) : (
              <span className="text-muted-foreground px-2 py-0.5 text-xs">
                mês a mês
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Total de entradas
          </p>
          <p className="text-muted-foreground text-xs">
            Competência (inclui crédito não pago no caixa).
          </p>
          <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
            {formatCurrencyBRL(totals.totalIncome)}
          </h3>
          {!hasTransactions ? (
            <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
              Registre lançamentos do tipo{" "}
              <span className="text-foreground font-medium">entrada</span> em{" "}
              <Link
                to={ROUTES.movimentacoes}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Movimentações
              </Link>{" "}
              para o total aparecer aqui.
            </p>
          ) : null}
        </div>

        <div className="bg-card rounded-xl border p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-destructive/15 p-2">
              <ArrowDownLeftIcon className="text-destructive size-5" />
            </div>
            {incomeExpenseMoM.expensePct ? (
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  incomeExpenseMoM.expensePct.startsWith("-")
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {incomeExpenseMoM.expensePct}
              </span>
            ) : (
              <span className="text-muted-foreground px-2 py-0.5 text-xs">
                mês a mês
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Total de saídas
          </p>
          <p className="text-muted-foreground text-xs">
            Competência (compras no crédito contam aqui).
          </p>
          <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
            {formatCurrencyBRL(totals.totalExpense)}
          </h3>
          {!hasTransactions ? (
            <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
              Registre{" "}
              <span className="text-foreground font-medium">saídas</span> (e
              compras no crédito) em{" "}
              <Link
                to={ROUTES.movimentacoes}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Movimentações
              </Link>
              .
            </p>
          ) : null}
        </div>

        <div className="bg-card rounded-xl border p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="bg-primary/10 rounded-lg p-2">
              <WalletIcon className="text-primary size-5" />
            </div>
            <span className="text-muted-foreground px-2 py-0.5 text-xs">
              Saldo
            </span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            No caixa (contas)
          </p>
          <h3
            className={cn(
              "mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight",
              cashTotals.balance < 0 && "text-destructive"
            )}
          >
            {formatCurrencyBRL(cashTotals.balance)}
          </h3>
          <p className="text-muted-foreground mt-2 text-xs leading-snug">
            Pix, dinheiro, pagamento de fatura e demais movimentos imediatos na
            conta. Competência geral:{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                totals.balance < 0 && "text-destructive"
              )}
            >
              {formatCurrencyBRL(totals.balance)}
            </span>
          </p>
          {!hasTransactions ? (
            <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
              O saldo do caixa soma apenas lançamentos que movimentam conta
              (ex.: Pix, dinheiro, pagamento de fatura). Cadastre-os em{" "}
              <Link
                to={ROUTES.movimentacoes}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Movimentações
              </Link>
              .
            </p>
          ) : null}
        </div>

        <div className="bg-card rounded-xl border p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="bg-muted rounded-lg p-2">
              <CreditCard className="text-muted-foreground size-5" />
            </div>
            <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link to={ROUTES.cartoes}>Cartões</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Crédito em aberto
          </p>
          <h3
            className={cn(
              "mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight",
              creditDebtTotal > 0 && "text-destructive"
            )}
          >
            {formatCurrencyBRL(creditDebtTotal)}
          </h3>
          <p className="text-muted-foreground mt-2 text-xs">
            Soma das faturas ainda não pagas (por ciclo de fechamento).
          </p>
          {!hasTransactions && creditDebtTotal === 0 ? (
            <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
              Com compras no cartão aparece dívida conforme o fechamento. Use{" "}
              <Link
                to={ROUTES.movimentacoes}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Movimentações
              </Link>{" "}
              e cadastre{" "}
              <Link
                to={ROUTES.cartoes}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                cartões
              </Link>{" "}
              ativos.
            </p>
          ) : null}
        </div>

        <div className="bg-card rounded-xl border p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="bg-muted rounded-lg p-2">
              <BarChart3Icon className="text-muted-foreground size-5" />
            </div>
            <span className="text-muted-foreground px-2 py-0.5 text-xs">
              Média
            </span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Saída média por mês
          </p>
          <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
            {formatCurrencyBRL(averageMonthlySpend)}
          </h3>
          {!hasMonthlyFlow ? (
            <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
              A média divide o total de saídas pelo número de meses que têm
              lançamentos. Com pelo menos um mês com dados, o valor passa a
              refletir isso.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-lg">Evolução mensal</CardTitle>
              <CardDescription>
                Entradas e saídas por mês no intervalo dos lançamentos.
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: "var(--finance-income)" }}
                />
                <span className="text-muted-foreground text-xs font-medium">
                  Entradas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: "var(--finance-expense)" }}
                />
                <span className="text-muted-foreground text-xs font-medium">
                  Saídas
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative px-2 sm:px-4">
            {!hasMonthlyFlow ? (
              <div
                className="bg-muted/20 flex aspect-auto min-h-[240px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center sm:min-h-[280px]"
                role="status"
              >
                <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                  Ainda não há meses com lançamentos. Cadastre movimentações com{" "}
                  <span className="text-foreground font-medium">
                    data de competência
                  </span>{" "}
                  em{" "}
                  <Link
                    to={ROUTES.movimentacoes}
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    Movimentações
                  </Link>
                  ; o gráfico agrupa entradas e saídas por mês automaticamente.
                </p>
              </div>
            ) : (
              <ChartContainer
                config={flowChartConfig}
                className="aspect-auto h-[280px] w-full min-h-[240px]"
              >
                <AreaChart
                  accessibilityLayer
                  data={monthlyFlow}
                  margin={{ left: 8, right: 12, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`fillIncome-${chartGradId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-income)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-income)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id={`fillExpense-${chartGradId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-expense)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-expense)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={56}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("pt-BR", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(Number(v))
                    }
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    content={
                      <ChartTooltipContent formatter={flowTooltipFormatter} />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="var(--color-income)"
                    strokeWidth={2}
                    fill={`url(#fillIncome-${chartGradId})`}
                    fillOpacity={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="var(--color-expense)"
                    strokeWidth={2}
                    fill={`url(#fillExpense-${chartGradId})`}
                    fillOpacity={1}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-w-0 flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Top categorias</CardTitle>
            <CardDescription>
              {distributionMode === "expense"
                ? "Maiores saídas por categoria."
                : "Maiores entradas por categoria."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-1 flex-col gap-4 pb-2">
            {categorySlices.length === 0 ? (
              <div
                className="bg-muted/20 flex min-h-[200px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center"
                role="status"
              >
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {hasTransactions ? (
                    <>
                      Nenhuma categoria com valor neste modo (saídas ou
                      entradas). Associe uma{" "}
                      <span className="text-foreground font-medium">
                        categoria
                      </span>{" "}
                      aos lançamentos ou crie categorias em{" "}
                      <Link
                        to={ROUTES.categorias}
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Categorias
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      O gráfico usa lançamentos com categoria. Cadastre{" "}
                      <Link
                        to={ROUTES.categorias}
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        categorias
                      </Link>{" "}
                      e registre movimentações em{" "}
                      <Link
                        to={ROUTES.movimentacoes}
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Movimentações
                      </Link>{" "}
                      escolhendo a categoria em cada uma.
                    </>
                  )}
                </p>
              </div>
            ) : (
                  <>
                    <ChartContainer
                      config={categoryPieChartConfig}
                      className="aspect-auto flex-1 min-h-[0] w-full"
                    >
                      <PieChart>
                        <ChartTooltip
                          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                          content={
                            <ChartTooltipContent
                              formatter={currencyTooltipFormatter}
                              labelKey="category"
                              nameKey="category"
                            />
                          }
                        />
                        <Pie
                          data={categoryPieData}
                          dataKey="value"
                          nameKey="category"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {categoryPieData.map((entry) => (
                            <Cell key={entry.category} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>

                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2">
                      {categorySlices.map((row) => {
                        const cfg = categoryPieChartConfig[row.key]
                        return (
                          <div
                            key={row.key}
                            className="flex items-center gap-1.5"
                          >
                            <span
                              className="h-2 w-2 rounded-[2px] shrink-0"
                              style={{
                                backgroundColor:
                                  typeof cfg?.color === "string"
                                    ? cfg.color
                                    : "transparent",
                              }}
                            />
                            <span className="text-muted-foreground text-xs font-medium">
                              {row.name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
                <div className="border-border mt-auto border-t pt-4">
                  <Button
                    variant="link"
                    className="text-primary h-auto w-full p-0 text-xs font-bold"
                    asChild
                  >
                    <Link to={ROUTES.categorias}>Ver todas as categorias</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-card overflow-hidden rounded-xl border">
            <div className="bg-muted/30 border-b px-6 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h4 className="font-heading font-bold">
                    Próximas pendências (7 dias)
                  </h4>
                  <span className="text-muted-foreground text-xs">
                    Período fixo de hoje até hoje + 6 dias.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                    Entradas: {formatCurrencyBRL(upcomingPendenciesTotals.income)}
                  </span>
                  <span className="text-destructive font-medium tabular-nums">
                    Saídas: {formatCurrencyBRL(upcomingPendenciesTotals.expense)}
                  </span>
                </div>
              </div>
            </div>
            {upcomingPendencies.length === 0 ? (
              <div
                className="text-muted-foreground px-6 py-8 text-center text-sm leading-relaxed sm:px-8 sm:text-left"
                role="status"
              >
                Nada previsto nesta janela. Esta lista reúne vencimentos de
                fatura, parcelas, recorrências e lançamentos futuros com data
                nos próximos 7 dias. Cadastre-os em{" "}
                <Link
                  to={ROUTES.movimentacoes}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Movimentações
                </Link>
                ,{" "}
                <Link
                  to={ROUTES.recorrencias}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Recorrências
                </Link>{" "}
                ou{" "}
                <Link
                  to={ROUTES.parcelamentos}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Parcelamentos
                </Link>
                , ou aguarde o ciclo do cartão em{" "}
                <Link
                  to={ROUTES.cartoes}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Cartões
                </Link>
                .
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Data
                    </TableHead>
                    <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Descrição
                    </TableHead>
                    <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Tipo
                    </TableHead>
                    <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                      Origem
                    </TableHead>
                    <TableHead className="text-muted-foreground px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
                      Valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingPendencies.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        {formatTransactionDate(row.date)}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-medium">
                        {row.title}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-6 py-4",
                          row.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        )}
                      >
                        {transactionTypeLabel(row.type)}
                      </TableCell>
                      <TableCell className="text-muted-foreground px-6 py-4">
                        {row.source === "credit_statement"
                          ? "Fatura"
                          : row.source === "installment"
                            ? "Parcelamento"
                            : row.source === "recurring"
                              ? "Recorrência"
                              : "Movimentação"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-6 py-4 text-right font-medium tabular-nums",
                          row.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        )}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          <span aria-hidden>{row.type === "income" ? "+" : "−"}</span>
                          <span>{formatCurrencyBRL(row.amount)}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="bg-card overflow-hidden rounded-xl border">
            <div className="bg-muted/30 border-b px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-heading font-bold">
                  Resumo mensal
                </h4>
                <Button variant="link" className="text-primary h-auto p-0" asChild>
                  <Link to={ROUTES.movimentacoes}>
                    Ver movimentações
                  </Link>
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                    Mês
                  </TableHead>
                  <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                    Entradas
                  </TableHead>
                  <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                    Saídas
                  </TableHead>
                  <TableHead className="text-muted-foreground px-6 py-4 text-xs font-bold uppercase tracking-wider">
                    Saldo
                  </TableHead>
                  <TableHead className="text-muted-foreground px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
                    Var. saldo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground px-6 py-8 text-center text-sm leading-relaxed"
                    >
                      Sem linhas ainda: o resumo lista os últimos 12 meses que
                      têm lançamentos. Registre movimentações com data de
                      competência em{" "}
                      <Link
                        to={ROUTES.movimentacoes}
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Movimentações
                      </Link>
                      .
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell className="px-6 py-4 font-medium">
                        {row.label}
                      </TableCell>
                      <TableCell className="text-emerald-600 dark:text-emerald-400 px-6 py-4 tabular-nums">
                        {formatCurrencyBRL(row.income)}
                      </TableCell>
                      <TableCell className="text-destructive px-6 py-4 tabular-nums">
                        {formatCurrencyBRL(row.expense)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-6 py-4 font-semibold tabular-nums",
                          row.balance < 0 && "text-destructive"
                        )}
                      >
                        {formatCurrencyBRL(row.balance)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right text-sm tabular-nums">
                        {row.balanceMoMPct === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              row.balanceMoMPct >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                            }
                          >
                            {row.balanceMoMPct >= 0 ? "+" : ""}
                            {row.balanceMoMPct.toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
    </div>
  )
}
