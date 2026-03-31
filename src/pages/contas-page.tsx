import { LandmarkIcon, PlusIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { AccountDeleteDialog } from "@/components/accounts/account-delete-dialog"
import { AccountDetailSheet } from "@/components/accounts/account-detail-sheet"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { AccountTransferDialog } from "@/components/accounts/account-transfer-dialog"
import { AccountTransferToolbarButton } from "@/components/accounts/account-transfer-toolbar-button"
import { AccountWalletView } from "@/components/accounts/account-wallet-view"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { accountNetBalance } from "@/lib/account-ui"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useTransactions } from "@/hooks/use-transactions"
import type { Account } from "@/types/account"

export function ContasPage() {
  const { accounts, create, update, remove } = useAccounts()
  const { categories } = useCategories()
  const { transactions, transferBetweenAccounts } = useTransactions()

  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null)

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

  const totalCashBalance = useMemo(() => {
    let sum = 0
    for (const a of sortedAccounts) {
      sum += accountNetBalance(transactions, a.id)
    }
    return sum
  }, [sortedAccounts, transactions])

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.name)
    return m
  }, [categories])

  const detailAccount = useMemo(() => {
    if (!detailAccountId) return null
    return accounts.find((a) => a.id === detailAccountId) ?? null
  }, [accounts, detailAccountId])

  useEffect(() => {
    if (detailAccountId && !accounts.some((a) => a.id === detailAccountId)) {
      setDetailAccountId(null)
    }
  }, [accounts, detailAccountId])

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

  return (
    <div className="flex flex-col gap-8">
      {!hasAccounts ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
            <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
            <div className="relative">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Contas
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                Cadastre contas correntes, poupança ou dinheiro em espécie para
                vincular movimentações imediatas (Pix, espécie, liquidações).
              </p>
            </div>
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
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8">
            <div className="from-primary/15 absolute inset-x-0 top-0 h-full bg-gradient-to-r via-transparent to-transparent" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                  Contas
                </h1>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                  Visualize como no app do banco: deslize entre as contas, toque
                  para ver o extrato no caixa e use o menu para editar ou excluir.
                  Transferências entre contas correntes ficam no botão ao lado.
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
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Saldo total em contas
            </p>
            <p
              className={cn(
                "font-heading mt-1 text-3xl font-bold tabular-nums tracking-tight",
                totalCashBalance < 0 && "text-destructive",
                totalCashBalance > 0 && "text-emerald-600 dark:text-emerald-400",
                totalCashBalance === 0 && "text-muted-foreground"
              )}
            >
              {formatCurrencyBRL(totalCashBalance)}
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              Soma do saldo no caixa de todas as contas listadas (imediato). Não
              inclui limite de cartão.
            </p>
          </div>

          <AccountWalletView
            accounts={sortedAccounts}
            transactions={transactions}
            onOpenAccount={(a) => setDetailAccountId(a.id)}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
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

      <AccountDetailSheet
        open={detailAccount !== null}
        onOpenChange={(open) => {
          if (!open) setDetailAccountId(null)
        }}
        account={detailAccount}
        transactions={transactions}
        categoryNameById={categoryNameById}
        onEditAccount={(a) => {
          setAccountToEdit(a)
          setFormOpen(true)
        }}
      />
    </div>
  )
}
