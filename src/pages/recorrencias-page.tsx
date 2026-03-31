import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  RepeatIcon,
  ScaleIcon,
  TagsIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { RecurringDeleteDialog } from "@/components/recurring/recurring-delete-dialog"
import { RecurringFormDialog } from "@/components/recurring/recurring-form-dialog"
import { RecurringLaunchDialog } from "@/components/recurring/recurring-launch-dialog"
import { RecurringListTable } from "@/components/recurring/recurring-list-table"
import { PageIntro } from "@/components/shared/page-intro"
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
import { useRecurringRules } from "@/hooks/use-recurring-rules"
import { formatCurrencyBRL } from "@/lib/format-currency"
import type { RecurringRule } from "@/types/recurring"

export function RecorrenciasPage() {
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { cards } = useCards()
  const { rules, create, update, remove, launch } = useRecurringRules()

  const [formOpen, setFormOpen] = useState(false)
  const [ruleToEdit, setRuleToEdit] = useState<RecurringRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null)
  const [launchTarget, setLaunchTarget] = useState<RecurringRule | null>(null)
  const [launchDialogKey, setLaunchDialogKey] = useState(0)

  const hasCategories = categories.length > 0

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) {
      m.set(c.id, c.name)
    }
    return m
  }, [categories])

  const cardNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cards) m.set(c.id, c.name)
    return m
  }, [cards])

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) m.set(a.id, a.name)
    return m
  }, [accounts])

  const sortedRules = useMemo(
    () =>
      [...rules].sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
      ),
    [rules]
  )

  const stats = useMemo(() => {
    let active = 0
    let activeIncomeAmount = 0
    let activeExpenseAmount = 0
    for (const r of rules) {
      if (!r.active) continue
      active += 1
      if (r.type === "income") activeIncomeAmount += r.amount
      else activeExpenseAmount += r.amount
    }
    return {
      active,
      total: rules.length,
      activeIncomeAmount,
      activeExpenseAmount,
    }
  }, [rules])
  const forecastBalance = stats.activeIncomeAmount - stats.activeExpenseAmount

  const openCreate = () => {
    setRuleToEdit(null)
    setFormOpen(true)
  }

  const openEdit = (r: RecurringRule) => {
    setRuleToEdit(r)
    setFormOpen(true)
  }

  const confirmDelete = (): boolean => {
    const id = deleteTarget?.id
    if (!id) return false
    const ok = remove(id)
    if (ok) toast.success("Recorrência excluída.")
    else toast.error("Não foi possível excluir a recorrência.")
    return ok
  }

  const handleLaunchConfirm = (
    dateISO: string,
    launchAmount?: number,
    updateRecurringAmount?: boolean
  ) => {
    if (!launchTarget) return
    try {
      launch(launchTarget.id, dateISO, launchAmount, updateRecurringAmount ?? false)
      toast.success("Lançamento criado a partir da recorrência.")
      setLaunchTarget(null)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível lançar a recorrência."
      )
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
        <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Recorrências
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Cadastre receitas e despesas que se repetem. Quando quiser registrar
              de fato nas movimentações, use o botão “Lançar”.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="font-semibold shrink-0 self-start md:self-auto"
            disabled={!hasCategories}
            onClick={openCreate}
          >
            <PlusIcon data-icon="inline-start" />
            Nova recorrência
          </Button>
        </div>
      </div>

      <PageIntro
        title="Como funcionam as recorrências"
        description="Cada item é um modelo (valor, categoria, meio de pagamento e periodicidade). Nada entra automaticamente no extrato: você escolhe a data e clica em Lançar para gerar o lançamento em Entradas/Saídas."
      />

      {!hasCategories ? (
        <Alert className="border bg-card flex items-center justify-between shadow-sm">
          <div className="flex items-start gap-2">
            <TagsIcon className="size-4" />
            <div className="flex flex-col gap-1">
              <AlertTitle>Cadastre categorias primeiro</AlertTitle>
              <AlertDescription>
                É preciso ter ao menos uma categoria para criar recorrências.
              </AlertDescription>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={ROUTES.categorias}>Ir para categorias</Link>
          </Button>
        </Alert>
      ) : null}

      {hasCategories && stats.total > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card rounded-xl border p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-emerald-500/15 p-2">
                <ArrowUpIcon className="size-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Receita ativa total
            </p>
            <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrencyBRL(stats.activeIncomeAmount)}
            </h3>
          </div>
          <div className="bg-card rounded-xl border p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-destructive/15 p-2">
                <ArrowDownIcon className="size-5 text-destructive" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Despesa ativa total
            </p>
            <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight text-destructive">
              {formatCurrencyBRL(stats.activeExpenseAmount)}
            </h3>
          </div>
          <div className="bg-card rounded-xl border p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-primary/15 p-2">
                <ScaleIcon className="size-5 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Saldo previsto</p>
            <h3
              className={`mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight ${
                forecastBalance > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : forecastBalance < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {formatCurrencyBRL(forecastBalance)}
            </h3>
          </div>
        </div>
      ) : null}

      {hasCategories && sortedRules.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RepeatIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhuma recorrência ainda</EmptyTitle>
            <EmptyDescription>
              Crie um modelo de entrada ou saída periódica. Depois, use Lançar
              para registrar no extrato quando fizer sentido para você.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="lg" className="font-semibold" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              Criar primeira recorrência
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {hasCategories && sortedRules.length > 0 ? (
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="bg-muted/30 border-b px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-heading font-bold">Lista de recorrências</h4>
              <span className="text-muted-foreground text-xs font-medium">
                {sortedRules.length}{" "}
                {sortedRules.length === 1 ? "registro" : "registros"} ·{" "}
                {stats.active} {stats.active === 1 ? "ativa" : "ativas"}
              </span>
            </div>
          </div>
          <RecurringListTable
            rules={sortedRules}
            categoryNameById={categoryNameById}
            accountNameById={accountNameById}
            cardNameById={cardNameById}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onLaunch={(r) => {
              setLaunchTarget(r)
              setLaunchDialogKey((k) => k + 1)
            }}
          />
        </div>
      ) : null}

      <RecurringFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setRuleToEdit(null)
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
        ruleToEdit={ruleToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <RecurringDeleteDialog
        rule={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />

      <RecurringLaunchDialog
        key={launchDialogKey}
        open={launchTarget !== null}
        onOpenChange={(open) => {
          if (!open) setLaunchTarget(null)
        }}
        rule={launchTarget}
        onConfirm={handleLaunchConfirm}
      />
    </div>
  )
}
