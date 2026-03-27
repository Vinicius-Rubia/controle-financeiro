import { PencilIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AccountAvatar } from "@/components/accounts/account-avatar"
import { accountKindLabel, accountNetBalance } from "@/lib/account-ui"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type { Account } from "@/types/account"
import type { Transaction } from "@/types/transaction"

export function AccountListTable({
  accounts,
  transactions,
  onEdit,
  onDelete,
}: {
  accounts: Account[]
  transactions: Transaction[]
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Conta
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Tipo
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider tabular-nums">
              Saldo no caixa (imediato)
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Estado
            </TableHead>
            <TableHead className="w-[1%] px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const bal = accountNetBalance(transactions, account.id)
            return (
              <TableRow key={account.id}>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3 font-medium">
                    <AccountAvatar
                      name={account.name}
                      logoDataUrl={account.logoDataUrl}
                      sizeClassName="size-8"
                    />
                    {account.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground px-6 py-4 text-sm">
                  {accountKindLabel(account.kind)}
                </TableCell>
                <TableCell
                  className={cn(
                    "px-6 py-4 text-sm font-medium tabular-nums",
                    bal < 0 && "text-destructive",
                    bal > 0 && "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {formatCurrencyBRL(bal)}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant={account.active ? "default" : "secondary"}>
                    {account.active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(account)}
                      aria-label={`Editar ${account.name}`}
                    >
                      <PencilIcon data-icon="inline-start" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(account)}
                      aria-label={`Excluir ${account.name}`}
                    >
                      <Trash2Icon data-icon="inline-start" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
