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
import type { Category } from "@/types/category"

export function CategoryDeleteDialog({
  category,
  open,
  onOpenChange,
  transactionCount,
  onConfirm,
}: {
  category: Category | null
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionCount: number
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
          <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3 text-left">
              <p>
                {category ? (
                  <>
                    A categoria{" "}
                    <span className="text-foreground font-medium">
                      {category.name}
                    </span>{" "}
                    será removida permanentemente.
                  </>
                ) : null}
              </p>
              {transactionCount > 0 ? (
                <p className="text-foreground font-medium">
                  Esta categoria está vinculada a{" "}
                  <span className="tabular-nums">{transactionCount}</span>{" "}
                  {transactionCount === 1 ? "lançamento" : "lançamentos"}. Os
                  registros permanecem no histórico, mas podem ficar sem
                  categoria correspondente na lista até você reclassificá-los.
                </p>
              ) : null}
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
