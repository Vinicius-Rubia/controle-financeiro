import { PencilIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountAvatar } from "@/components/accounts/account-avatar"
import { accountKindLabel, accountNetBalance } from "@/lib/account-ui"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type { Account } from "@/types/account"
import type { Transaction } from "@/types/transaction"

export function AccountListCards({
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
    <ul className="flex flex-col gap-3">
      {accounts.map((account) => {
        const bal = accountNetBalance(transactions, account.id)
        return (
          <li key={account.id}>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <AccountAvatar
                      name={account.name}
                      logoDataUrl={account.logoDataUrl}
                      sizeClassName="size-9 shrink-0"
                    />
                    <CardTitle className="text-base">{account.name}</CardTitle>
                  </div>
                  <Badge variant={account.active ? "default" : "secondary"}>
                    {account.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  {accountKindLabel(account.kind)}
                </p>
                <p>
                  <span className="text-muted-foreground">Saldo no caixa (imediato):</span>{" "}
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      bal < 0 && "text-destructive",
                      bal > 0 && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {formatCurrencyBRL(bal)}
                  </span>
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-1 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(account)}
                >
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(account)}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Excluir
                </Button>
              </CardFooter>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
