import {
  CoinsIcon,
  PencilIcon,
  PiggyBankIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { AddSavingsContributionDialog } from "@/components/savings-goals/add-savings-contribution-dialog"
import { SavingsGoalFormDialog } from "@/components/savings-goals/savings-goal-form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAccounts } from "@/hooks/use-accounts"
import { useSavingsGoals } from "@/hooks/use-savings-goals"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { savedThisMonth, totalSavedForGoal } from "@/lib/savings-goal-ui"
import { cn } from "@/lib/utils"
import type { SavingsGoal, SavingsGoalContribution } from "@/types/savings-goal"

function formatContributionDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  if (!y || !m || !d) return isoDate
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function progressPercent(saved: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((saved / target) * 100))
}

function sortedContributions(goal: SavingsGoal): SavingsGoalContribution[] {
  return [...goal.contributions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.id.localeCompare(a.id)
  })
}

export function MetasPage() {
  const { accounts } = useAccounts()
  const { goals, create, update, remove, addContribution, removeContribution } =
    useSavingsGoals()

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) m.set(a.id, a.name)
    return m
  }, [accounts])

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.active),
    [accounts]
  )

  const [formOpen, setFormOpen] = useState(false)
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null)
  const [contributionOpen, setContributionOpen] = useState(false)
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null)
  const [deleteGoal, setDeleteGoal] = useState<SavingsGoal | null>(null)
  const [pendingRemoveContribution, setPendingRemoveContribution] = useState<{
    goalId: string
    contributionId: string
  } | null>(null)

  const sortedGoals = useMemo(
    () =>
      [...goals].sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
      ),
    [goals]
  )

  const openCreate = () => {
    setGoalToEdit(null)
    setFormOpen(true)
  }

  const openEdit = (goal: SavingsGoal) => {
    setGoalToEdit(goal)
    setFormOpen(true)
  }

  const openContribution = (goal: SavingsGoal) => {
    setContributionGoal(goal)
    setContributionOpen(true)
  }

  const confirmDeleteGoal = () => {
    const id = deleteGoal?.id
    if (!id) return
    const ok = remove(id)
    if (ok) toast.success("Meta excluída.")
    else toast.error("Não foi possível excluir.")
    setDeleteGoal(null)
  }

  const confirmRemoveContribution = () => {
    if (!pendingRemoveContribution) return
    const next = removeContribution(
      pendingRemoveContribution.goalId,
      pendingRemoveContribution.contributionId
    )
    if (next) toast.success("Aporte removido.")
    else toast.error("Não foi possível remover o aporte.")
    setPendingRemoveContribution(null)
  }

  const hasGoals = goals.length > 0

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
        <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Metas (cofrinho)
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Crie objetivos como &quot;juntar para viagem&quot;, defina o ritmo mensal e
              registre aportes escolhendo a conta de origem — cada aporte gera uma
              despesa no extrato (categoria Meta / cofrinho).
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="shrink-0 gap-2">
            <PlusIcon className="size-4" />
            Nova meta
          </Button>
        </div>
      </div>

      {!hasGoals ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PiggyBankIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhuma meta ainda</EmptyTitle>
            <EmptyDescription>
              Crie sua primeira meta para acompanhar o que já guardou e o ritmo do
              mês em relação ao que planejou.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={openCreate} className="gap-2">
              <PlusIcon className="size-4" />
              Criar meta
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {activeAccounts.length === 0 ? (
            <Alert>
              <AlertTitle>Cadastre uma conta ativa</AlertTitle>
              <AlertDescription>
                Para registrar aportes é preciso ter pelo menos uma conta ativa — o
                valor sai do saldo dela como despesa.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
          {sortedGoals.map((goal) => {
            const total = totalSavedForGoal(goal)
            const monthSaved = savedThisMonth(goal)
            const target = goal.targetTotalAmount
            const pct = target !== null ? progressPercent(total, target) : null
            const monthOk = monthSaved >= goal.monthlyTargetAmount
            const list = sortedContributions(goal)

            return (
              <Card
                key={goal.id}
                className="flex h-full min-h-0 flex-col overflow-hidden"
              >
                <CardHeader className="shrink-0 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <PiggyBankIcon className="text-muted-foreground size-5 shrink-0" />
                        <span className="truncate">{goal.title}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Meta mensal: {formatCurrencyBRL(goal.monthlyTargetAmount)}
                        {target !== null
                          ? ` · Total: ${formatCurrencyBRL(target)}`
                          : null}
                        {goal.targetDeadlineDate
                          ? ` · Prazo: ${formatContributionDate(goal.targetDeadlineDate)}`
                          : null}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(goal)}
                        aria-label="Editar meta"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive size-8"
                        onClick={() => setDeleteGoal(goal)}
                        aria-label="Excluir meta"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pb-2">
                  <div className="shrink-0">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Guardado no total
                    </p>
                    <p className="font-heading text-2xl font-bold tabular-nums">
                      {formatCurrencyBRL(total)}
                    </p>
                    {target !== null ? (
                      <div className="mt-2 space-y-1">
                        <div className="bg-muted h-2 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full transition-[width]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {pct}% da meta · Faltam{" "}
                          {formatCurrencyBRL(Math.max(0, target - total))}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "shrink-0 rounded-lg border px-3 py-2 text-sm",
                      monthOk
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "bg-muted/40 border-transparent"
                    )}
                  >
                    <span className="text-muted-foreground">Este mês: </span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrencyBRL(monthSaved)}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {formatCurrencyBRL(goal.monthlyTargetAmount)}
                    </span>
                  </div>

                  <div className="flex min-h-0 shrink-0 flex-col">
                    <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                      Aportes
                    </p>
                    <div className="border-muted/60 h-[136px] shrink-0 overflow-hidden rounded-md border">
                      {list.length === 0 ? (
                        <div className="text-muted-foreground flex h-full items-center px-3 text-sm leading-snug">
                          Nenhum aporte ainda. Use o botão abaixo quando guardar um
                          valor.
                        </div>
                      ) : (
                        <ScrollArea className="h-[136px]">
                          <ul className="space-y-2 p-2 pr-3">
                            {list.map((c) => (
                              <li
                                key={c.id}
                                className="flex items-start justify-between gap-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium tabular-nums">
                                    {formatCurrencyBRL(c.amount)}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatContributionDate(c.date)}
                                    {c.accountId
                                      ? ` · ${accountNameById.get(c.accountId) ?? "Conta"}`
                                      : ""}
                                    {c.note ? ` · ${c.note}` : ""}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                                  aria-label="Remover aporte"
                                  onClick={() =>
                                    setPendingRemoveContribution({
                                      goalId: goal.id,
                                      contributionId: c.id,
                                    })
                                  }
                                >
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="shrink-0 border-t pt-4">
                  <Button
                    type="button"
                    className="w-full gap-2"
                    disabled={activeAccounts.length === 0}
                    onClick={() => openContribution(goal)}
                  >
                    <CoinsIcon className="size-4" />
                    Registrar aporte
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
          </div>
        </div>
      )}

      <SavingsGoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        goalToEdit={goalToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <AddSavingsContributionDialog
        open={contributionOpen}
        onOpenChange={(o) => {
          setContributionOpen(o)
          if (!o) setContributionGoal(null)
        }}
        goal={contributionGoal}
        accounts={accounts}
        onAdd={(input) => {
          try {
            addContribution(input)
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : "Não foi possível registrar o aporte."
            toast.error(msg)
          }
        }}
      />

      <AlertDialog open={!!deleteGoal} onOpenChange={(o) => !o && setDeleteGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGoal
                ? `A meta "${deleteGoal.title}" será excluída, os aportes somem do cofrinho e as despesas vinculadas no extrato também serão removidas.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingRemoveContribution}
        onOpenChange={(o) => !o && setPendingRemoveContribution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aporte?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor sai do total do cofrinho e o lançamento de despesa correspondente
              é removido do extrato (quando existir).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveContribution}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
