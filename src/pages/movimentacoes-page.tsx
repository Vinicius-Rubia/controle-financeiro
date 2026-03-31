import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  LandmarkIcon,
  ListIcon,
  PlusIcon,
  TagsIcon,
  WalletIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { AccountTransferDialog } from "@/components/accounts/account-transfer-dialog"
import { AccountTransferToolbarButton } from "@/components/accounts/account-transfer-toolbar-button"
import { TransactionDeleteDialog } from "@/components/transactions/transaction-delete-dialog"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { TransactionListTable } from "@/components/transactions/transaction-list-table"
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
import { filterAndSortTransactions } from "@/lib/filter-transactions"
import type { TransactionListFilters } from "@/lib/filter-transactions"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useCards } from "@/hooks/use-cards"
import { useTransactions } from "@/hooks/use-transactions"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/transaction"

const initialFilters: TransactionListFilters = {
  type: "all",
  categoryId: "all",
  accountId: "all",
  cashScope: "all",
  dateFrom: "",
  dateTo: "",
  search: "",
}

export function MovimentacoesPage() {
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { cards } = useCards()
  const { transactions, create, update, remove, transferBetweenAccounts } =
    useTransactions()

  const [filters, setFilters] = useState<TransactionListFilters>(initialFilters)
  const [transferOpen, setTransferOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) {
      m.set(c.id, c.name)
    }
    return m
  }, [categories])

  const filteredTransactions = useMemo(
    () => filterAndSortTransactions(transactions, filters),
    [transactions, filters]
  )

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

  const checkingAccounts = useMemo(
    () => accounts.filter((a) => a.active && a.kind === "checking"),
    [accounts]
  )

  const filteredTotals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filteredTransactions) {
      if (t.type === "income") income += t.amount
      else expense += t.amount
    }
    return {
      income,
      expense,
      balance: income - expense,
      count: filteredTransactions.length,
    }
  }, [filteredTransactions])

  const hasCategories = categories.length > 0
  const hasAccounts = accounts.length > 0
  const filtersActive = useMemo(() => {
    return (
      filters.type !== "all" ||
      filters.categoryId !== "all" ||
      filters.accountId !== "all" ||
      filters.cashScope !== "all" ||
      Boolean(filters.dateFrom) ||
      Boolean(filters.dateTo) ||
      Boolean(filters.search.trim())
    )
  }, [filters])

  const openCreate = () => {
    setTransactionToEdit(null)
    setFormOpen(true)
  }

  const openEdit = (t: Transaction) => {
    setTransactionToEdit(t)
    setFormOpen(true)
  }

  const confirmDelete = (): boolean => {
    const id = deleteTarget?.id
    if (!id) return false
    const pair = Boolean(deleteTarget.transferGroupId)
    const ok = remove(id)
    if (ok) {
      toast.success(
        pair
          ? "Transferência excluída (saída e entrada)."
          : "Lançamento excluído."
      )
    } else toast.error("Não foi possível excluir o lançamento.")
    return ok
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
        <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            Entradas e saídas
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Gerencie seu extrato com uma visão clara das entradas, saídas e
              saldo líquido do período filtrado.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 self-start sm:flex-row sm:items-center md:self-auto">
            <AccountTransferToolbarButton
              enabled={checkingAccounts.length >= 2}
              onPress={() => setTransferOpen(true)}
            />
            <Button
              type="button"
              size="lg"
              className="font-semibold"
              disabled={!hasCategories || !hasAccounts}
              onClick={openCreate}
            >
              <PlusIcon data-icon="inline-start" />
              Novo lançamento
            </Button>
          </div>
        </div>
      </div>

      {!hasCategories ? (
        <Alert className="border bg-card shadow-sm flex items-center justify-between">
          <div className="flex items-start gap-2">
            <TagsIcon className="size-4" />
            <div className="flex flex-col gap-1">
              <AlertTitle>Cadastre categorias primeiro</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Para criar lançamentos, é necessário ter ao menos uma categoria.
                  Ela deve ser compatível com o tipo de movimento (entrada, saída
                  ou ambos).
                </span>
              </AlertDescription>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={ROUTES.categorias}>Ir para categorias</Link>
          </Button>
        </Alert>
      ) : null}

      {hasCategories && !hasAccounts ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LandmarkIcon />
            </EmptyMedia>
            <EmptyTitle>Cadastre ao menos uma conta</EmptyTitle>
            <EmptyDescription>
              Todo lançamento exige uma conta. Pix, dinheiro e saídas imediatas
              alteram o saldo na hora; no crédito, a mesma conta serve de
              referência e para pagar a fatura.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="default" size="lg" className="font-semibold">
              <Link to={ROUTES.contas}>Ir para contas</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {hasCategories && hasAccounts ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="from-emerald-500/[0.11] to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-emerald-500/15 p-2">
                  <ArrowUpRightIcon className="size-5 text-emerald-500" />
                </div>
                <span className="text-muted-foreground px-2 py-0.5 text-xs">
                  Filtrado
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Total de entradas
              </p>
              <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
                {formatCurrencyBRL(filteredTotals.income)}
              </h3>
            </div>

            <div className="from-destructive/10 to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-destructive/15 p-2">
                  <ArrowDownLeftIcon className="text-destructive size-5" />
                </div>
                <span className="text-muted-foreground px-2 py-0.5 text-xs">
                  Filtrado
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Total de saídas
              </p>
              <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
                {formatCurrencyBRL(filteredTotals.expense)}
              </h3>
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
                Resultado (entradas − saídas)
              </p>
              <h3
                className={cn(
                  "mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight",
                  filteredTotals.balance < 0 && "text-destructive"
                )}
              >
                {formatCurrencyBRL(filteredTotals.balance)}
              </h3>
            </div>

            <div className="from-muted/60 to-card rounded-2xl border bg-gradient-to-b p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="bg-muted rounded-lg p-2">
                  <ListIcon className="text-muted-foreground size-5" />
                </div>
                <span className="text-muted-foreground px-2 py-0.5 text-xs">
                  Lista
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Lançamentos exibidos
              </p>
              <h3 className="mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight">
                {filteredTotals.count}
              </h3>
            </div>
          </div>

          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            accounts={accounts}
            disabled={!hasCategories}
          />
        </>
      ) : null}

      {hasCategories && hasAccounts && transactions.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum lançamento ainda</EmptyTitle>
            <EmptyDescription>
              Comece registrando uma entrada ou saída vinculada a uma
              categoria.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="lg" className="font-semibold" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              Criar primeiro lançamento
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {hasCategories &&
      hasAccounts &&
      transactions.length > 0 &&
      filteredTransactions.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListIcon />
            </EmptyMedia>
            <EmptyTitle>Nada encontrado</EmptyTitle>
            <EmptyDescription>
              Nenhum lançamento corresponde aos filtros atuais. Ajuste tipo,
              categoria, conta, período ou o texto de busca.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters(initialFilters)}
            >
              Limpar filtros
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {hasCategories && hasAccounts && filteredTransactions.length > 0 ? (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="bg-muted/30 border-b px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-heading font-bold">Extrato de lançamentos</h4>
              <div className="flex flex-wrap items-center gap-3">
                {filtersActive ? (
                  <span className="text-muted-foreground text-xs font-medium">
                    Filtros ativos · {filteredTotals.count}{" "}
                    {filteredTotals.count === 1 ? "registro" : "registros"}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs font-medium">
                    {filteredTotals.count}{" "}
                    {filteredTotals.count === 1 ? "registro" : "registros"}
                  </span>
                )}
                <Button
                  variant="link"
                  className="text-primary h-auto p-0 text-xs font-bold"
                  asChild
                >
                  <Link to={ROUTES.dashboard}>
                    Ver relatórios
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <TransactionListTable
            transactions={filteredTransactions}
            categoryNameById={categoryNameById}
            accountNameById={accountNameById}
            cardNameById={cardNameById}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </div>
      ) : null}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setTransactionToEdit(null)
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
        transactions={transactions}
        transactionToEdit={transactionToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <AccountTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        checkingAccounts={checkingAccounts}
        transactions={transactions}
        onTransfer={transferBetweenAccounts}
      />

      <TransactionDeleteDialog
        transaction={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
