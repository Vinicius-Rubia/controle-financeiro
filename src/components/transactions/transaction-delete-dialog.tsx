import { Trash2Icon } from "lucide-react"

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
import { formatCurrencyBRL } from "@/lib/format-currency"
import type { Transaction } from "@/types/transaction"

export function TransactionDeleteDialog({
  transaction,
  open,
  onOpenChange,
  onConfirm,
}: {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => boolean
}) {
  const handleConfirm = () => {
    const ok = onConfirm()
    if (ok) onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2 text-left">
              <p>
                {transaction ? (
                  <>
                    <span className="text-foreground font-medium">
                      {transaction.title}
                    </span>{" "}
                    ({formatCurrencyBRL(transaction.amount)}) será removido
                    permanentemente do armazenamento local.
                  </>
                ) : null}
              </p>
              {transaction?.transferGroupId ? (
                <p>
                  O lançamento pareado da mesma transferência (entrada ou saída
                  na outra conta) também será excluído.
                </p>
              ) : null}
              <p>Esta ação não pode ser desfeita.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            <Trash2Icon data-icon="inline-start" />
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
