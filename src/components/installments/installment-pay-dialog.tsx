import { format } from "date-fns"
import { CalendarIcon, CheckIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { todayISODate } from "@/lib/transaction-ui"
import type { Installment, InstallmentPlan } from "@/types/installment"

function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((n) => Number(n))
  return new Date(year, month - 1, day)
}

export function InstallmentPayDialog({
  open,
  onOpenChange,
  plan,
  installment,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: InstallmentPlan | null
  installment: Installment | null
  onConfirm: (dateISO: string, settledAmount?: number) => void
}) {
  const [dateISO, setDateISO] = useState(() => todayISODate())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [hasDiscount, setHasDiscount] = useState(false)
  const [discountedAmountInput, setDiscountedAmountInput] = useState("")
  const isCreditPayment = plan?.paymentMethod === "credit_card"
  const title = isCreditPayment ? "Lançar parcela na fatura" : "Registrar pagamento da parcela"
  const dateLabel = isCreditPayment ? "Data de lançamento" : "Data do pagamento"
  const confirmLabel = isCreditPayment ? "Confirmar lançamento" : "Confirmar pagamento"
  const installmentAmount = installment?.amount ?? 0
  const parsedDiscountedAmount = parseCurrencyInputBR(discountedAmountInput)
  const isDiscountedAmountValid =
    !hasDiscount ||
    (parsedDiscountedAmount !== null &&
      parsedDiscountedAmount > 0 &&
      parsedDiscountedAmount <= installmentAmount)

  useEffect(() => {
    if (!open) return
    setDateISO(todayISODate())
    setPickerOpen(false)
    setHasDiscount(false)
    setDiscountedAmountInput(
      installment ? formatCurrencyInputBRFromNumber(installment.amount) : ""
    )
  }, [open, installment])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {plan && installment ? (
              isCreditPayment ? (
                <>
                  Será criado um lançamento no crédito para{" "}
                  <span className="text-foreground font-medium">
                    {plan.title} ({installment.number}/{plan.installmentCount})
                  </span>{" "}
                  no valor de {formatCurrencyBRL(installment.amount)}. Isso não quita
                  a fatura; apenas lança a parcela no ciclo correspondente.
                </>
              ) : (
                <>
                  Será registrado o pagamento de{" "}
                  <span className="text-foreground font-medium">
                    {plan.title} ({installment.number}/{plan.installmentCount})
                  </span>{" "}
                  no valor de {formatCurrencyBRL(installment.amount)} na conta selecionada.
                </>
              )
            ) : (
              "Selecione a data."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{dateLabel}</p>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="justify-start gap-2">
                <CalendarIcon data-icon="inline-start" />
                {dateISO
                  ? isoDateToLocalDate(dateISO).toLocaleDateString("pt-BR")
                  : "Selecione"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateISO ? isoDateToLocalDate(dateISO) : undefined}
                onSelect={(d) => {
                  if (!d) return
                  setDateISO(format(d, "yyyy-MM-dd"))
                  setPickerOpen(false)
                }}
                weekStartsOn={1}
                showOutsideDays
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">Desconto</p>
          <div className="flex items-center gap-2">
            <Toggle
              type="button"
              variant="outline"
              pressed={hasDiscount}
              onPressedChange={setHasDiscount}
              disabled={!installment}
            >
              {hasDiscount ? "Com desconto" : "Sem desconto"}
            </Toggle>
            <span className="text-muted-foreground text-xs">
              Parcela original: {formatCurrencyBRL(installmentAmount)}
            </span>
          </div>
          {hasDiscount ? (
            <div className="space-y-1">
              <Input
                inputMode="numeric"
                value={discountedAmountInput}
                onChange={(event) => {
                  setDiscountedAmountInput(maskCurrencyInputBR(event.target.value))
                }}
                placeholder="Valor com desconto"
              />
              {!isDiscountedAmountValid ? (
                <p className="text-destructive text-xs">
                  Informe um valor maior que zero e menor ou igual ao valor da parcela.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!plan || !installment || !dateISO || !isDiscountedAmountValid}
            onClick={() => {
              if (!dateISO.trim()) return
              const settledAmount = hasDiscount ? parsedDiscountedAmount ?? undefined : undefined
              onConfirm(dateISO.trim(), settledAmount)
            }}
          >
            <CheckIcon data-icon="inline-start" />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
