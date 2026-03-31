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
import type { PlannedPayment } from "@/types/planned-payment"

export function PlannedPaymentDeleteDialog({
  planning,
  open,
  onOpenChange,
  onConfirm,
}: {
  planning: PlannedPayment | null
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
          <AlertDialogTitle>Excluir planejamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {planning ? (
              <>
                O planejamento{" "}
                <span className="text-foreground font-medium">{planning.title}</span>{" "}
                será removido do armazenamento local.
              </>
            ) : null}
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
