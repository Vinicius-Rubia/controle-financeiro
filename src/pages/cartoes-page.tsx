import { CreditCardIcon, LandmarkIcon, PlusIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { CardDeleteDialog } from "@/components/cards/card-delete-dialog"
import { CardFormDialog } from "@/components/cards/card-form-dialog"
import { CardListCards } from "@/components/cards/card-list-cards"
import { CardListTable } from "@/components/cards/card-list-table"
import { CardStatementSheet } from "@/components/cards/card-statement-sheet"
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
import { useInstallmentPlans } from "@/hooks/use-installment-plans"
import { useTransactions } from "@/hooks/use-transactions"
import type { Card } from "@/types/card"

export function CartoesPage() {
  const { accounts } = useAccounts()
  const { cards, create, update, remove } = useCards()
  const { transactions } = useTransactions()
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

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) m.set(a.id, a.name)
    return m
  }, [accounts])

  const accountLogoById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) {
      if (a.logoDataUrl) m.set(a.id, a.logoDataUrl)
    }
    return m
  }, [accounts])

  const openCreate = () => {
    setCardToEdit(null)
    setFormOpen(true)
  }

  const openEdit = (card: Card) => {
    setCardToEdit(card)
    setFormOpen(true)
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
  const activeCount = cards.filter((c) => c.active).length

  return (
    <div className="flex flex-col gap-8">
      {!hasAccounts ? (
        <>
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Cartões
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Cada cartão fica vinculado a uma conta para fechamento e pagamento
              da fatura.
            </p>
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
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Cartões
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Cadastre cartões para vincular aos seus lançamentos.
            </p>
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
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Cartões
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Gerencie cartões ativos/inativos e dados de ciclo da fatura.
              </p>
            </div>
            <Button type="button" size="lg" className="font-semibold" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              Novo cartão
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-card rounded-xl border p-6">
              <p className="text-muted-foreground text-sm">Total</p>
              <h3 className="font-heading text-2xl font-bold">{cards.length}</h3>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <p className="text-muted-foreground text-sm">Ativos</p>
              <h3 className="font-heading text-2xl font-bold">{activeCount}</h3>
            </div>
          </div>

          <div className="hidden md:block">
            <CardListTable
              cards={sortedCards}
              transactions={transactions}
              installmentPlans={plans}
              accountNameById={accountNameById}
              accountLogoById={accountLogoById}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onOpenStatements={setStatementCard}
            />
          </div>
          <div className="md:hidden">
            <CardListCards
              cards={sortedCards}
              transactions={transactions}
              installmentPlans={plans}
              accountNameById={accountNameById}
              accountLogoById={accountLogoById}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onOpenStatements={setStatementCard}
            />
          </div>
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
      />
    </div>
  )
}
