import { LandmarkIcon, PlusIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { AccountDeleteDialog } from "@/components/accounts/account-delete-dialog"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { AccountTransferDialog } from "@/components/accounts/account-transfer-dialog"
import { AccountTransferToolbarButton } from "@/components/accounts/account-transfer-toolbar-button"
import { AccountListCards } from "@/components/accounts/account-list-cards"
import { AccountListTable } from "@/components/accounts/account-list-table"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useAccounts } from "@/hooks/use-accounts"
import { useTransactions } from "@/hooks/use-transactions"
import type { Account } from "@/types/account"

export function ContasPage() {
  const { accounts, create, update, remove } = useAccounts()
  const { transactions, transferBetweenAccounts } = useTransactions()

  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      ),
    [accounts]
  )

  const checkingAccounts = useMemo(
    () => sortedAccounts.filter((a) => a.active && a.kind === "checking"),
    [sortedAccounts]
  )

  const openCreate = () => {
    setAccountToEdit(null)
    setFormOpen(true)
  }

  const openEdit = (account: Account) => {
    setAccountToEdit(account)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    const id = deleteTarget?.id
    if (!id) return false
    const ok = remove(id)
    if (ok) toast.success("Conta excluída.")
    else {
      toast.error(
        "Não foi possível excluir: existem lançamentos ou recorrências usando esta conta."
      )
    }
    return ok
  }

  const hasAccounts = accounts.length > 0
  const activeCount = accounts.filter((a) => a.active).length

  return (
    <div className="flex flex-col gap-8">
      {!hasAccounts ? (
        <>
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              Contas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Cadastre contas correntes, poupança ou dinheiro em espécie para
              vincular movimentações imediatas (Pix, espécie, liquidações).
            </p>
          </div>
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LandmarkIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhuma conta cadastrada</EmptyTitle>
              <EmptyDescription>
                Crie sua primeira conta para registrar onde cada movimentação
                entra ou sai.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" onClick={openCreate}>
                <PlusIcon data-icon="inline-start" />
                Criar primeira conta
              </Button>
            </EmptyContent>
          </Empty>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Contas
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Contas mostram o saldo em caixa (Pix, espécie, pagamento de
                fatura). Dívida de cartão fica na fatura até liquidar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AccountTransferToolbarButton
                enabled={checkingAccounts.length >= 2}
                onPress={() => setTransferOpen(true)}
              />
              <Button
                type="button"
                size="lg"
                className="font-semibold"
                onClick={openCreate}
              >
                <PlusIcon data-icon="inline-start" />
                Nova conta
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card rounded-xl border p-6">
              <p className="text-muted-foreground text-sm">Total</p>
              <h3 className="font-heading text-2xl font-bold">{accounts.length}</h3>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <p className="text-muted-foreground text-sm">Ativas</p>
              <h3 className="font-heading text-2xl font-bold">{activeCount}</h3>
            </div>
          </div>

          <div className="hidden md:block">
            <AccountListTable
              accounts={sortedAccounts}
              transactions={transactions}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </div>
          <div className="md:hidden">
            <AccountListCards
              accounts={sortedAccounts}
              transactions={transactions}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </div>
        </>
      )}

      <AccountFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setAccountToEdit(null)
        }}
        accounts={accounts}
        accountToEdit={accountToEdit}
        onCreate={create}
        onUpdate={update}
      />

      <AccountDeleteDialog
        account={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />

      <AccountTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        checkingAccounts={checkingAccounts}
        transactions={transactions}
        onTransfer={transferBetweenAccounts}
      />
    </div>
  )
}
