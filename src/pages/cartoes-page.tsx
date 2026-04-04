import { CreditCardIcon, LandmarkIcon, PlusIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { CardDeleteDialog } from "@/components/cards/card-delete-dialog"
import { CardFormDialog } from "@/components/cards/card-form-dialog"
import { CardStatementSheet } from "@/components/cards/card-statement-sheet"
import { CardWalletView } from "@/components/cards/card-wallet-view"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useAccounts } from "@/hooks/use-accounts"
import { useCards } from "@/hooks/use-cards"
import { useCategories } from "@/hooks/use-categories"
import { useInstallmentPlans } from "@/hooks/use-installment-plans"
import { useTransactions } from "@/hooks/use-transactions"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { totalCreditOutstanding } from "@/lib/credit-statement"
import { cn } from "@/lib/utils"
import type { Card } from "@/types/card"
import type { CreateTransactionInput } from "@/types/transaction"

export function CartoesPage() {
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { cards, create, update, remove, getById } = useCards()
  const { transactions, create: createTransactionMovement } = useTransactions()
  const { plans } = useInstallmentPlans()

  const [formOpen, setFormOpen] = useState(false)
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)
  const [statementCard, setStatementCard] = useState<Card | null>(null)

  const sortedCards = useMemo(
    () =>
      [...cards].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      ),
    [cards]
  )

  const totalFaturasEmAberto = useMemo(() => {
    let sum = 0
    for (const c of sortedCards) {
      sum += totalCreditOutstanding(transactions, c)
    }
    return sum
  }, [sortedCards, transactions])

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) m.set(a.id, a.name)
    return m
  }, [accounts])

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.name)
    return m
  }, [categories])

  const openCreate = () => {
    setCardToEdit(null)
    setFormOpen(true)
  }

  const openEdit = (card: Card) => {
    setCardToEdit(getById(card.id) ?? card)
    setFormOpen(true)
  }

  const payStatement = (input: CreateTransactionInput) => {
    try {
      createTransactionMovement(input)
      toast.success("Pagamento da fatura registrado.")
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível registrar o pagamento."
      )
      throw e
    }
  }

  const confirmDelete = () => {
    const id = deleteTarget?.id
    if (!id) return false
    const ok = remove(id)
    if (ok) toast.success("Cartão excluído.")
    else toast.error("Não foi possível excluir o cartão.")
    return ok
  }

  const hasAccounts = accounts.length > 0
  const hasCards = cards.length > 0

  return (
    <div className="flex flex-col gap-8">
      {!hasAccounts ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
            <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
            <div className="relative">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Cartões
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                Cada cartão fica vinculado a uma conta para fechamento e pagamento
                da fatura.
              </p>
            </div>
          </div>
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LandmarkIcon />
              </EmptyMedia>
              <EmptyTitle>Cadastre ao menos uma conta</EmptyTitle>
              <EmptyDescription>
                Para criar um cartão, é preciso ter uma conta corrente ou
                equivalente cadastrada. Ela será usada como conta de cobrança da
                fatura.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="lg" className="font-semibold">
                <Link to={ROUTES.contas}>Ir para contas</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </>
      ) : !hasCards ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
            <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
            <div className="relative">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Cartões
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Cadastre cartões para vincular aos seus lançamentos.
              </p>
            </div>
          </div>
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCardIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhum cartão cadastrado</EmptyTitle>
              <EmptyDescription>
                Crie seu primeiro cartão de crédito para acompanhar faturas.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" onClick={openCreate}>
                <PlusIcon data-icon="inline-start" />
                Criar primeiro cartão
              </Button>
            </EmptyContent>
          </Empty>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
            <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                  Cartões
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Visualize como na carteira do banco: toque no cartão para abrir
                  a fatura e ver cada lançamento.
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                className="font-semibold"
                onClick={openCreate}
              >
                <PlusIcon data-icon="inline-start" />
                Novo cartão
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Total em faturas
            </p>
            <p
              className={cn(
                "font-heading mt-1 text-3xl font-bold tabular-nums tracking-tight",
                totalFaturasEmAberto > 0 && "text-destructive",
                totalFaturasEmAberto === 0 && "text-muted-foreground"
              )}
            >
              {formatCurrencyBRL(totalFaturasEmAberto)}
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              Soma do valor em aberto em todos os ciclos de fechamento dos cartões
              listados.
            </p>
          </div>

          <CardWalletView
            cards={sortedCards}
            transactions={transactions}
            installmentPlans={plans}
            accountNameById={accountNameById}
            onOpenStatement={setStatementCard}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </>
      )}

      <CardFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setCardToEdit(null)
        }}
        accounts={accounts}
        cards={cards}
        cardToEdit={cardToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <CardDeleteDialog
        card={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />

      <CardStatementSheet
        open={statementCard !== null}
        onOpenChange={(open) => {
          if (!open) setStatementCard(null)
        }}
        card={statementCard}
        transactions={transactions}
        installmentPlans={plans}
        categoryNameById={categoryNameById}
        accounts={accounts}
        onPayStatement={payStatement}
      />
    </div>
  )
}
