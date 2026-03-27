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
import type { InstallmentPlan } from "@/types/installment"

export function InstallmentPlanDeleteDialog({
  plan,
  open,
  onOpenChange,
  onConfirm,
}: {
  plan: InstallmentPlan | null
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
          <AlertDialogTitle>Excluir parcelamento?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {plan ? (
                  <>
                    <span className="text-foreground font-medium">{plan.title}</span>{" "}
                    ({plan.installmentCount}x · {formatCurrencyBRL(plan.totalAmount)})
                    será removido do armazenamento local.
                  </>
                ) : null}
              </p>
              <p>
                Parcelamentos com parcelas lançadas parcialmente não podem ser
                excluídos.
              </p>
              <p>
                Se estiver concluído (quitado), a exclusão é permitida e os
                lançamentos já gerados permanecem no histórico.
              </p>
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
