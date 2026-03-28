import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { ArrowRightLeftIcon, CalendarIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { accountNetBalanceThroughDate } from "@/lib/account-ui"
import {
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { todayISODate } from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import type { Account } from "@/types/account"
import type { CreateAccountTransferInput, Transaction } from "@/types/transaction"

const schema = z
  .object({
    fromAccountId: z.string().min(1, "Selecione a conta de origem."),
    toAccountId: z.string().min(1, "Selecione a conta de destino."),
    amount: z
      .string()
      .trim()
      .min(1, "Informe o valor.")
      .refine(
        (s) => parseCurrencyInputBR(s) !== null,
        "Valor deve ser maior que zero."
      ),
    date: z.string().min(1, "Informe a data."),
    description: z.string(),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: "Origem e destino devem ser diferentes.",
    path: ["toAccountId"],
  })

type FormValues = z.infer<typeof schema>

function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((n) => Number(n))
  return new Date(year, month - 1, day)
}

function defaultValues(accounts: Account[]): FormValues {
  const a0 = accounts[0]?.id ?? ""
  const a1 = accounts[1]?.id ?? a0
  return {
    fromAccountId: a0,
    toAccountId: accounts.length > 1 ? a1 : "",
    amount: "",
    date: todayISODate(),
    description: "",
  }
}

export function AccountTransferDialog({
  open,
  onOpenChange,
  checkingAccounts,
  transactions,
  onTransfer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Contas correntes ativas (já filtradas). */
  checkingAccounts: Account[]
  transactions: Transaction[]
  onTransfer: (input: CreateAccountTransferInput) => void
}) {
  const [dateOpen, setDateOpen] = useState(false)

  const sorted = useMemo(
    () =>
      [...checkingAccounts].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      ),
    [checkingAccounts]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(sorted),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(sorted))
    }
  }, [open, sorted, form])

  const fromAccountId = useWatch({ control: form.control, name: "fromAccountId" })
  const toAccountId = useWatch({ control: form.control, name: "toAccountId" })
  const txDate = useWatch({ control: form.control, name: "date" })
  const amountStr = useWatch({ control: form.control, name: "amount" })

  const accountsForFrom = useMemo(
    () => sorted.filter((a) => a.id !== toAccountId),
    [sorted, toAccountId]
  )
  const accountsForTo = useMemo(
    () => sorted.filter((a) => a.id !== fromAccountId),
    [sorted, fromAccountId]
  )

  useEffect(() => {
    if (!open || sorted.length < 2) return
    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      const fallback =
        sorted.find((a) => a.id !== fromAccountId)?.id ?? ""
      form.setValue("toAccountId", fallback, { shouldValidate: true })
    }
  }, [open, sorted, fromAccountId, toAccountId, form])

  const todayStr = todayISODate()

  const balanceThroughDate = useMemo(() => {
    if (!fromAccountId?.trim() || !txDate?.trim()) return null
    return accountNetBalanceThroughDate(
      transactions,
      fromAccountId.trim(),
      txDate.trim()
    )
  }, [transactions, fromAccountId, txDate])

  const parsedAmount = amountStr ? parseCurrencyInputBR(amountStr) : null
  const insufficientBalance =
    balanceThroughDate !== null &&
    parsedAmount !== null &&
    parsedAmount > 0 &&
    parsedAmount > balanceThroughDate

  const onSubmit = form.handleSubmit((values) => {
    const amount = parseCurrencyInputBR(values.amount)
    if (amount === null || amount <= 0) {
      toast.error("Informe um valor válido.")
      return
    }
    if (values.date.trim() > todayStr) {
      toast.error("Não é possível usar data futura.")
      return
    }
    const bal = accountNetBalanceThroughDate(
      transactions,
      values.fromAccountId.trim(),
      values.date.trim()
    )
    if (amount > bal) {
      toast.error("Saldo insuficiente na conta de origem nesta data.")
      return
    }
    try {
      onTransfer({
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        amount,
        date: values.date.trim(),
        description: values.description.trim(),
      })
      toast.success("Transferência registrada.")
      onOpenChange(false)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível registrar a transferência."
      )
    }
  })

  const canSubmit = sorted.length >= 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[90dvh] w-full max-w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 px-4 pt-4 pr-12 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeftIcon className="size-5 shrink-0" />
            Transferir entre contas correntes
          </DialogTitle>
          <DialogDescription>
            Serão criados dois lançamentos: saída na conta de origem e entrada na
            de destino, com o mesmo valor e data.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            <FieldGroup className="grid gap-4">
              <Field
                data-invalid={
                  form.formState.errors.fromAccountId ? true : undefined
                }
              >
                <FieldLabel>De (conta corrente)</FieldLabel>
                <Controller
                  name="fromAccountId"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v)
                        if (v === toAccountId) {
                          const next = sorted.find((a) => a.id !== v)?.id ?? ""
                          form.setValue("toAccountId", next, {
                            shouldValidate: true,
                          })
                        }
                      }}
                      disabled={!canSubmit || form.formState.isSubmitting}
                    >
                      <SelectTrigger
                        aria-invalid={!!form.formState.errors.fromAccountId}
                        className="w-full"
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountsForFrom.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.fromAccountId]} />
              </Field>

              <Field
                data-invalid={
                  form.formState.errors.toAccountId ? true : undefined
                }
              >
                <FieldLabel>Para (conta corrente)</FieldLabel>
                <Controller
                  name="toAccountId"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v)
                        if (v === fromAccountId) {
                          const next = sorted.find((a) => a.id !== v)?.id ?? ""
                          form.setValue("fromAccountId", next, {
                            shouldValidate: true,
                          })
                        }
                      }}
                      disabled={!canSubmit || form.formState.isSubmitting}
                    >
                      <SelectTrigger
                        aria-invalid={!!form.formState.errors.toAccountId}
                        className="w-full"
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountsForTo.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.toAccountId]} />
              </Field>

              <Field
                data-invalid={form.formState.errors.amount ? true : undefined}
              >
                <FieldLabel htmlFor="xfer-amount">Valor (R$)</FieldLabel>
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="xfer-amount"
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={(e) =>
                        field.onChange(maskCurrencyInputBR(e.target.value))
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0,00"
                      aria-invalid={!!form.formState.errors.amount}
                    />
                  )}
                />
                <FieldDescription>
                  {balanceThroughDate !== null ? (
                    <>
                      Saldo disponível nesta data na origem:{" "}
                      <span className="text-foreground font-medium tabular-nums">
                        {formatCurrencyBRL(balanceThroughDate)}
                      </span>
                      .
                    </>
                  ) : (
                    "A saída será registrada na origem e a entrada, no destino."
                  )}
                </FieldDescription>
                {insufficientBalance ? (
                  <p className="text-destructive text-sm" role="alert">
                    O valor ultrapassa o saldo disponível na conta de origem até
                    esta data.
                  </p>
                ) : null}
                <FieldError errors={[form.formState.errors.amount]} />
              </Field>

              <Field
                data-invalid={form.formState.errors.date ? true : undefined}
              >
                <FieldLabel>Data</FieldLabel>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={form.formState.isSubmitting}
                      aria-invalid={!!form.formState.errors.date}
                      className="w-full justify-start gap-2"
                    >
                      <CalendarIcon data-icon="inline-start" />
                      <span className="truncate">
                        {txDate
                          ? isoDateToLocalDate(txDate).toLocaleDateString("pt-BR")
                          : "Selecione a data"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        txDate ? isoDateToLocalDate(txDate) : undefined
                      }
                      onSelect={(d) => {
                        if (!d) return
                        const iso = format(d, "yyyy-MM-dd")
                        if (iso > todayStr) return
                        form.setValue("date", iso, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                        setDateOpen(false)
                      }}
                      disabled={(day) => format(day, "yyyy-MM-dd") > todayStr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FieldDescription>
                  Apenas datas até hoje (não é possível agendar transferência).
                </FieldDescription>
                <FieldError errors={[form.formState.errors.date]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="xfer-desc">Observação (opcional)</FieldLabel>
                <Textarea
                  id="xfer-desc"
                  rows={2}
                  placeholder="Ex.: Resgate para pagamentos"
                  autoComplete="off"
                  disabled={form.formState.isSubmitting}
                  {...form.register("description")}
                />
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="shrink-0 border-t px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                !canSubmit ||
                form.formState.isSubmitting ||
                insufficientBalance
              }
            >
              {form.formState.isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Confirmar transferência
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
