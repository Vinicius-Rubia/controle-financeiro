import { BanIcon } from "lucide-react"

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

export function InstallmentPlanCancelDialog({
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
          <AlertDialogTitle>Cancelar parcelamento?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {plan ? (
                  <>
                    <span className="text-foreground font-medium">{plan.title}</span>{" "}
                    ({plan.installmentCount}x · {formatCurrencyBRL(plan.totalAmount)})
                    terá as parcelas futuras canceladas.
                  </>
                ) : null}
              </p>
              <p>
                Parcelas já lançadas em fatura serão mantidas no histórico e as
                parcelas reservadas serão canceladas, liberando o limite reservado.
              </p>
              <p>Esta ação não pode ser desfeita.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            <BanIcon data-icon="inline-start" />
            Confirmar cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
