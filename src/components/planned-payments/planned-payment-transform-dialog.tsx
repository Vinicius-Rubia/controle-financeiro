import { CreditCardIcon, ListChecksIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PlannedPayment } from "@/types/planned-payment"

export function PlannedPaymentTransformDialog({
  open,
  onOpenChange,
  planning,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  planning: PlannedPayment | null
  onChoose: (mode: "single" | "installment") => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[90dvh] w-full max-w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 px-4 pt-4 pr-12 text-left sm:px-6">
          <DialogTitle>Transformar em lançamento</DialogTitle>
          <DialogDescription>
            {planning ? (
              <>
                Escolha como lançar{" "}
                <span className="text-foreground font-medium">{planning.title}</span>.
              </>
            ) : (
              "Escolha como lançar este planejamento."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            <div className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start py-3 text-left"
                onClick={() => onChoose("single")}
              >
                <span className="flex items-start gap-2">
                  <ListChecksIcon className="mt-0.5 size-4" />
                  <span className="flex flex-col">
                    <span className="font-medium">Lançamento único</span>
                    <span className="text-muted-foreground text-xs">
                      À vista, cartão, boleto, pix ou outra forma.
                    </span>
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start py-3 text-left"
                onClick={() => onChoose("installment")}
              >
                <span className="flex items-start gap-2">
                  <CreditCardIcon className="mt-0.5 size-4" />
                  <span className="flex flex-col">
                    <span className="font-medium">Parcelamento</span>
                    <span className="text-muted-foreground text-xs">
                      Divide em parcelas e acompanha o plano depois.
                    </span>
                  </span>
                </span>
              </Button>
            </div>
          </div>

          <DialogFooter className="bg-background/98 supports-backdrop-filter:backdrop-blur-xs shrink-0 gap-2 border-t px-4 py-3 sm:px-6 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
