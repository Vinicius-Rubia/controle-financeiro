import { format } from "date-fns"
import { CalendarIcon, RocketIcon } from "lucide-react"
import { useEffect, useLayoutEffect, useState } from "react"

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
import type { RecurringRule } from "@/types/recurring"

function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((n) => Number(n))
  return new Date(year, month - 1, day)
}

function sameMoneyAmount(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100)
}

export function RecurringLaunchDialog({
  open,
  onOpenChange,
  rule,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: RecurringRule | null
  onConfirm: (
    dateISO: string,
    launchAmount?: number,
    updateRecurringAmount?: boolean
  ) => void
}) {
  const [dateISO, setDateISO] = useState(() => todayISODate())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [amountInput, setAmountInput] = useState("")
  const [updateRecurringAmount, setUpdateRecurringAmount] = useState(false)
  const parsedAmount = parseCurrencyInputBR(amountInput)
  const isAmountValid = parsedAmount !== null
  const launchDiffersFromRule =
    rule !== null &&
    parsedAmount !== null &&
    !sameMoneyAmount(parsedAmount, rule.amount)
  const showUpdateRecurringOption = launchDiffersFromRule
  const todayStr = todayISODate()

  useLayoutEffect(() => {
    if (!open) return
    setDateISO(todayISODate())
    setPickerOpen(false)
    if (rule) {
      setAmountInput(formatCurrencyInputBRFromNumber(rule.amount))
    } else {
      setAmountInput("")
    }
    setUpdateRecurringAmount(false)
  }, [open, rule?.id, rule?.amount])

  useEffect(() => {
    if (!launchDiffersFromRule) setUpdateRecurringAmount(false)
  }, [launchDiffersFromRule])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Lançar recorrência</DialogTitle>
          <DialogDescription>
            {rule ? (
              <>
                Será criado um lançamento com os dados de{" "}
                <span className="text-foreground font-medium">{rule.title}</span>{" "}
                na data escolhida.
              </>
            ) : (
              "Escolha a data do lançamento."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">Data do lançamento</p>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 sm:w-auto"
              >
                <CalendarIcon data-icon="inline-start" />
                <span>
                  {dateISO
                    ? isoDateToLocalDate(dateISO).toLocaleDateString("pt-BR")
                    : "Selecione"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateISO ? isoDateToLocalDate(dateISO) : undefined}
                onSelect={(d) => {
                  if (!d) return
                  const iso = format(d, "yyyy-MM-dd")
                  if (iso > todayStr) return
                  setDateISO(iso)
                  setPickerOpen(false)
                }}
                disabled={(day) => format(day, "yyyy-MM-dd") > todayStr}
                weekStartsOn={1}
                showOutsideDays
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">Valor deste lançamento</p>
          <Input
            inputMode="numeric"
            value={amountInput}
            onChange={(event) => {
              setAmountInput(maskCurrencyInputBR(event.target.value))
            }}
            placeholder="0,00"
          />
          <p className="text-muted-foreground text-xs">
            Valor atual da recorrência: {formatCurrencyBRL(rule?.amount ?? 0)}
          </p>
          {!isAmountValid ? (
            <p className="text-destructive text-xs">Informe um valor maior que zero.</p>
          ) : null}
        </div>

        {showUpdateRecurringOption ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              Aplicar para próximos lançamentos
            </p>
            <div className="flex items-center gap-2">
              <Toggle
                type="button"
                variant="outline"
                pressed={updateRecurringAmount}
                onPressedChange={setUpdateRecurringAmount}
                disabled={!rule?.active || !isAmountValid}
              >
                {updateRecurringAmount ? "Atualizar recorrência" : "Não atualizar recorrência"}
              </Toggle>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              !rule?.active ||
              !dateISO ||
              !isAmountValid ||
              dateISO.trim() > todayStr
            }
            onClick={() => {
              if (!dateISO.trim() || dateISO.trim() > todayStr) return
              onConfirm(
                dateISO.trim(),
                parsedAmount ?? undefined,
                showUpdateRecurringOption ? updateRecurringAmount : false
              )
            }}
          >
            <RocketIcon data-icon="inline-start" />
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
