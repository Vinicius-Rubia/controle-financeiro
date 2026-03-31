import { BarChart3Icon, CreditCardIcon, PieChartIcon, TrendingUpIcon } from "lucide-react"
import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

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
import { formatCurrencyBRL } from "@/lib/format-currency"
import { useCategories } from "@/hooks/use-categories"
import { useTransactions } from "@/hooks/use-transactions"
import { paymentMethodLabel } from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { PaymentMethod } from "@/types/transaction"

type FlowRow = { label: string; income: number; expense: number; balance: number }

const flowChartConfig = {
  income: { label: "Entradas", color: "var(--finance-income)" },
  expense: { label: "Saídas", color: "var(--finance-expense)" },
  balance: { label: "Saldo", color: "var(--primary)" },
} satisfies ChartConfig

const paymentMethodColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

function compact(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v)
}

function parseDate(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function monthlyKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function yearlyKey(date: Date): string {
  return String(date.getFullYear())
}

function weekKey(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 1)
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.floor((date.getTime() - start.getTime()) / dayMs)
  const week = Math.floor(days / 7) + 1
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, m - 1, 1))
}

function aggregateFlow(rows: { key: string; type: "income" | "expense"; amount: number }[]) {
  const byPeriod = new Map<string, { income: number; expense: number }>()
  for (const row of rows) {
    const current = byPeriod.get(row.key) ?? { income: 0, expense: 0 }
    if (row.type === "income") current.income += row.amount
    else current.expense += row.amount
    byPeriod.set(row.key, current)
  }
  return [...byPeriod.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({
      label,
      income: value.income,
      expense: value.expense,
      balance: value.income - value.expense,
    }))
}

export function RelatoriosPage() {
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories) map.set(category.id, category.name)
    return map
  }, [categories])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    let expenseCredit = 0
    for (const t of transactions) {
      if (t.type === "income") income += t.amount
      else expense += t.amount
      if (t.type === "expense" && t.paymentMethod === "credit_card") {
        expenseCredit += t.amount
      }
    }
    return { income, expense, balance: income - expense, expenseCredit }
  }, [transactions])

  const monthlyFlow = useMemo((): FlowRow[] => {
    const base: { key: string; type: "income" | "expense"; amount: number }[] = []
    for (const t of transactions) {
      const date = parseDate(t.date)
      if (!date) continue
      base.push({ key: monthlyKey(date), type: t.type, amount: t.amount })
    }
    return aggregateFlow(base).map((row) => ({ ...row, label: formatMonthLabel(row.label) }))
  }, [transactions])

  const weeklyFlow = useMemo((): FlowRow[] => {
    const base: { key: string; type: "income" | "expense"; amount: number }[] = []
    for (const t of transactions) {
      const date = parseDate(t.date)
      if (!date) continue
      base.push({ key: weekKey(date), type: t.type, amount: t.amount })
    }
    return aggregateFlow(base).slice(-12)
  }, [transactions])

  const yearlyFlow = useMemo((): FlowRow[] => {
    const base: { key: string; type: "income" | "expense"; amount: number }[] = []
    for (const t of transactions) {
      const date = parseDate(t.date)
      if (!date) continue
      base.push({ key: yearlyKey(date), type: t.type, amount: t.amount })
    }
    return aggregateFlow(base)
  }, [transactions])

  const expenseByCategory = useMemo(() => {
    const sums = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== "expense" || !t.categoryId) continue
      sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount)
    }
    return [...sums.entries()]
      .map(([id, value]) => ({
        id,
        name: categoryNameById.get(id) ?? "Categoria removida",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [transactions, categoryNameById])

  const incomeByCategory = useMemo(() => {
    const sums = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== "income" || !t.categoryId) continue
      sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount)
    }
    return [...sums.entries()]
      .map(([id, value]) => ({
        id,
        name: categoryNameById.get(id) ?? "Categoria removida",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [transactions, categoryNameById])

  const paymentUsage = useMemo(() => {
    const map = new Map<PaymentMethod, { count: number; amount: number }>()
    for (const t of transactions) {
      const current = map.get(t.paymentMethod) ?? { count: 0, amount: 0 }
      current.count += 1
      current.amount += t.amount
      map.set(t.paymentMethod, current)
    }
    return [...map.entries()]
      .map(([method, value]) => ({
        method,
        label: paymentMethodLabel(method),
        count: value.count,
        amount: value.amount,
      }))
      .sort((a, b) => b.count - a.count)
  }, [transactions])

  const paymentChartConfig = useMemo((): ChartConfig => {
    const config = {} as ChartConfig
    paymentUsage.forEach((row, index) => {
      config[row.method] = {
        label: row.label,
        color: paymentMethodColors[index % paymentMethodColors.length],
      }
    })
    return config
  }, [paymentUsage])

  const paymentPieData = useMemo(
    () =>
      paymentUsage.map((row) => ({
        method: row.method,
        value: row.count,
        fill: `var(--color-${row.method})`,
      })),
    [paymentUsage]
  )

  const topExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "expense")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 7),
    [transactions]
  )

  const topIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 7),
    [transactions]
  )

  const hasData = transactions.length > 0

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
        <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            Relatórios detalhados
          </h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            Visão analítica semanal, mensal e anual para acompanhar evolução,
            principais categorias, uso de cartão e comportamento por meio de pagamento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Entradas totais</CardDescription>
            <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">
              {formatCurrencyBRL(totals.income)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saídas totais</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {formatCurrencyBRL(totals.expense)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saldo acumulado</CardDescription>
            <CardTitle className={cn("text-2xl", totals.balance < 0 && "text-destructive")}>
              {formatCurrencyBRL(totals.balance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Gasto no cartão de crédito</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrencyBRL(totals.expenseCredit)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem dados para análise</CardTitle>
            <CardDescription>
              Cadastre movimentações para liberar os relatórios detalhados.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="size-4" />
                  Evolução mensal
                </CardTitle>
                <CardDescription>Entradas, saídas e saldo por mês.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                <ChartContainer config={flowChartConfig} className="h-[280px] w-full">
                  <AreaChart data={monthlyFlow} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={56}
                      tickFormatter={(v) => compact(Number(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="income" stroke="var(--color-income)" fill="var(--color-income)" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="expense" stroke="var(--color-expense)" fill="var(--color-expense)" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="balance" stroke="var(--color-balance)" fill="transparent" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="size-4" />
                  Evolução semanal
                </CardTitle>
                <CardDescription>Últimas 12 semanas por competência.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                <ChartContainer config={flowChartConfig} className="h-[280px] w-full">
                  <BarChart data={weeklyFlow} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={56}
                      tickFormatter={(v) => compact(Number(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2 min-w-0">
              <CardHeader>
                <CardTitle>Evolução anual</CardTitle>
                <CardDescription>Comparativo anual de entradas e saídas.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                <ChartContainer config={flowChartConfig} className="h-[260px] w-full">
                  <BarChart data={yearlyFlow} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={56}
                      tickFormatter={(v) => compact(Number(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="size-4" />
                  Meios de pagamento
                </CardTitle>
                <CardDescription>Frequência de uso por método.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ChartContainer config={paymentChartConfig} className="h-[220px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent labelKey="method" />} />
                    <Pie data={paymentPieData} dataKey="value" nameKey="method" innerRadius={52} outerRadius={86}>
                      {paymentPieData.map((entry) => (
                        <Cell key={entry.method} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="space-y-1 text-xs">
                  {paymentUsage.slice(0, 5).map((row) => (
                    <div key={row.method} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium tabular-nums">{row.count}x</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Top gastos por categoria</CardTitle>
                <CardDescription>Onde você mais gastou.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                <ChartContainer
                  config={{
                    value: { label: "Saídas", color: "var(--finance-expense)" },
                  }}
                  className="h-[300px] w-full"
                >
                  <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 12, right: 8 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => compact(Number(v))} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrencyBRL(Number(value))} />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Top entradas por categoria</CardTitle>
                <CardDescription>De onde veio mais dinheiro.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                <ChartContainer
                  config={{
                    value: { label: "Entradas", color: "var(--finance-income)" },
                  }}
                  className="h-[300px] w-full"
                >
                  <BarChart data={incomeByCategory} layout="vertical" margin={{ left: 12, right: 8 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => compact(Number(v))} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrencyBRL(Number(value))} />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCardIcon className="size-4" />
                  Maiores gastos unitários
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4">Título</TableHead>
                      <TableHead className="px-4">Categoria</TableHead>
                      <TableHead className="px-4">Pagamento</TableHead>
                      <TableHead className="px-4 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topExpenses.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="px-4 font-medium">{row.title}</TableCell>
                        <TableCell className="px-4 text-muted-foreground">
                          {row.categoryId ? categoryNameById.get(row.categoryId) ?? "Categoria removida" : "—"}
                        </TableCell>
                        <TableCell className="px-4 text-muted-foreground">
                          {paymentMethodLabel(row.paymentMethod)}
                        </TableCell>
                        <TableCell className="px-4 text-right text-destructive tabular-nums">
                          {formatCurrencyBRL(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maiores entradas unitárias</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4">Título</TableHead>
                      <TableHead className="px-4">Categoria</TableHead>
                      <TableHead className="px-4">Pagamento</TableHead>
                      <TableHead className="px-4 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topIncome.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="px-4 font-medium">{row.title}</TableCell>
                        <TableCell className="px-4 text-muted-foreground">
                          {row.categoryId ? categoryNameById.get(row.categoryId) ?? "Categoria removida" : "—"}
                        </TableCell>
                        <TableCell className="px-4 text-muted-foreground">
                          {paymentMethodLabel(row.paymentMethod)}
                        </TableCell>
                        <TableCell className="px-4 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrencyBRL(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
