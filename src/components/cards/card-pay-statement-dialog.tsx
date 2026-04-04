import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  moneyToCents,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { statementSummariesForCard } from "@/lib/credit-statement"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { todayISODate } from "@/lib/transaction-ui"
import type { Account } from "@/types/account"
import type { Card } from "@/types/card"
import type { CreateTransactionInput, Transaction } from "@/types/transaction"

const paySchema = z.object({
  title: z.string().trim().min(1, "Informe o título."),
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor.")
    .refine(
      (s) => parseCurrencyInputBR(s) !== null,
      "Valor deve ser maior que zero."
    ),
  accountId: z.string().min(1, "Selecione a conta."),
  date: z.string().min(1, "Informe a data."),
  description: z.string(),
})

type PayFormValues = z.infer<typeof paySchema>

function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((n) => Number(n))
  return new Date(year, month - 1, day)
}

export function CardPayStatementDialog({
  open,
  onOpenChange,
  card,
  closingIso,
  transactions,
  accounts,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: Card | null
  closingIso: string
  transactions: Transaction[]
  accounts: Account[]
  onConfirm: (input: CreateTransactionInput) => void
}) {
  const [dateOpen, setDateOpen] = useState(false)
  const todayStr = todayISODate()

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.active),
    [accounts]
  )

  const maxPay = useMemo(() => {
    if (!card || !closingIso) return 0
    const row = statementSummariesForCard(transactions, card).find(
      (s) => s.closingDateIso === closingIso
    )
    return row?.outstanding ?? 0
  }, [card, closingIso, transactions])

  const defaultAccountId = card?.accountId ?? activeAccounts[0]?.id ?? ""

  const form = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      title: "Pagamento de fatura",
      amount: "",
      accountId: defaultAccountId,
      date: todayStr,
      description: "",
    },
  })

  useEffect(() => {
    if (!open || !card) return
    const acc =
      card.accountId && activeAccounts.some((a) => a.id === card.accountId)
        ? card.accountId
        : activeAccounts[0]?.id ?? ""
    form.reset({
      title: "Pagamento de fatura",
      amount: formatCurrencyInputBRFromNumber(maxPay),
      accountId: acc,
      date: todayStr,
      description: "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apenas ao abrir / mudar ciclo
  }, [open, card?.id, closingIso, maxPay, todayStr, card?.accountId, accounts])

  const onSubmit = form.handleSubmit(async (values) => {
    await new Promise((r) => requestAnimationFrame(r))
    if (!card) return

    const amount = parseCurrencyInputBR(values.amount)
    if (amount === null) {
      form.setError("amount", { message: "Valor deve ser maior que zero." })
      return
    }
    if (moneyToCents(amount) > moneyToCents(maxPay)) {
      form.setError("amount", {
        message: `Valor acima do em aberto (${formatCurrencyBRL(maxPay)}).`,
      })
      return
    }

    const dateTrimmed = values.date.trim()
    if (dateTrimmed > todayStr) {
      form.setError("date", { message: "Não é possível usar data futura." })
      return
    }

    try {
      onConfirm({
        title: values.title.trim(),
        amount,
        type: "expense",
        paymentMethod: "credit_card_settlement",
        accountId: values.accountId.trim(),
        cardId: card.id,
        statementPeriodKey: closingIso,
        date: dateTrimmed,
        description: values.description.trim(),
      })
      onOpenChange(false)
    } catch {
      // Erro já exibido pelo chamador (ex.: toast)
    }
  })

  const txDate = form.watch("date")

  if (!card) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            Registra uma saída na conta selecionada e abate o valor desta fatura
            ({card.name}).
          </DialogDescription>
        </DialogHeader>

        {maxPay <= 0 ? (
          <>
            <p className="text-muted-foreground text-sm">
              Não há saldo em aberto neste fechamento.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <FieldGroup className="grid gap-4">
              <Field
                data-invalid={form.formState.errors.title ? true : undefined}
              >
                <FieldLabel htmlFor="pay-title">Título</FieldLabel>
                <Input
                  id="pay-title"
                  autoComplete="off"
                  aria-invalid={!!form.formState.errors.title}
                  {...form.register("title")}
                />
                <FieldError errors={[form.formState.errors.title]} />
              </Field>

              <Field
                data-invalid={form.formState.errors.amount ? true : undefined}
              >
                <FieldLabel htmlFor="pay-amount">Valor (máx. {formatCurrencyBRL(maxPay)})</FieldLabel>
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="pay-amount"
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
                <FieldError errors={[form.formState.errors.amount]} />
              </Field>

              <Field data-invalid={form.formState.errors.date ? true : undefined}>
                <FieldLabel>Data do pagamento</FieldLabel>
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
                        {txDate ? (
                          isoDateToLocalDate(txDate).toLocaleDateString("pt-BR")
                        ) : (
                          "Selecione"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={txDate ? isoDateToLocalDate(txDate) : undefined}
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
                      weekStartsOn={1}
                      showOutsideDays
                    />
                  </PopoverContent>
                </Popover>
                <FieldError errors={[form.formState.errors.date]} />
              </Field>

              <Field
                data-invalid={
                  form.formState.errors.accountId ? true : undefined
                }
              >
                <FieldLabel htmlFor="pay-account">Conta (débito)</FieldLabel>
                <Controller
                  name="accountId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="pay-account"
                        className="w-full"
                        aria-invalid={!!form.formState.errors.accountId}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.accountId]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="pay-desc">Descrição</FieldLabel>
                <Textarea
                  id="pay-desc"
                  rows={2}
                  placeholder="Opcional"
                  {...form.register("description")}
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Confirmar pagamento
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
