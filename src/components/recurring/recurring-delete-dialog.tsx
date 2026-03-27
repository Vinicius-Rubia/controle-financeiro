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
import { recurringScheduleLabel } from "@/lib/recurring-ui"
import type { RecurringRule } from "@/types/recurring"

export function RecurringDeleteDialog({
  rule,
  open,
  onOpenChange,
  onConfirm,
}: {
  rule: RecurringRule | null
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
          <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2 text-left">
              <p>
                {rule ? (
                  <>
                    <span className="text-foreground font-medium">
                      {rule.title}
                    </span>{" "}
                    ({formatCurrencyBRL(rule.amount)} ·{" "}
                    {recurringScheduleLabel(rule)}) será removida
                    permanentemente do armazenamento local.
                  </>
                ) : null}
              </p>
              <p>Lançamentos já criados a partir desta regra não são apagados.</p>
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
