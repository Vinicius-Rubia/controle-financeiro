import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, CoinsIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { format } from "date-fns"
import { toast } from "sonner"
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
  FieldDescription,
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
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { formatCurrencyBRL } from "@/lib/format-currency"
import { isoDateToLocalDate, todayISODate } from "@/lib/transaction-ui"
import type { Account } from "@/types/account"
import type { SavingsGoal } from "@/types/savings-goal"

function firstActiveAccountId(accounts: Account[]): string {
  return accounts.find((a) => a.active)?.id ?? ""
}

const formSchema = z
  .object({
    amount: z.string(),
    date: z.string().min(1, "Informe a data."),
    accountId: z.string().trim().min(1, "Selecione a conta."),
    note: z.string(),
  })
  .superRefine((values, ctx) => {
    const amount = parseCurrencyInputBR(values.amount)
    if (amount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Informe o valor guardado.",
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

export function AddSavingsContributionDialog({
  open,
  onOpenChange,
  goal,
  accounts,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: SavingsGoal | null
  accounts: Account[]
  onAdd: (input: {
    goalId: string
    amount: number
    accountId: string
    date?: string
    note?: string
  }) => void
}) {
  const [dateOpen, setDateOpen] = useState(false)
  const todayStr = todayISODate()
  const activeAccounts = accounts.filter((a) => a.active)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      date: todayStr,
      accountId: firstActiveAccountId(accounts),
      note: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        date: todayStr,
        accountId: firstActiveAccountId(accounts),
        note: "",
      })
    }
  }, [open, accounts, form, todayStr])

  const txDate = useWatch({ control: form.control, name: "date" })

  const onSubmit = form.handleSubmit((values) => {
    if (!goal) return
    const amount = parseCurrencyInputBR(values.amount)
    if (amount === null) return
    const note = values.note.trim()
    onAdd({
      goalId: goal.id,
      amount,
      accountId: values.accountId.trim(),
      date: values.date,
      note: note.length > 0 ? note : undefined,
    })
    toast.success("Aporte registrado.")
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CoinsIcon className="size-4 opacity-80" />
            Registrar aporte
          </DialogTitle>
          <DialogDescription>
            {goal ? (
              <>
                O valor sai da conta escolhida e entra no total de{" "}
                <span className="text-foreground font-medium">{goal.title}</span>.
              </>
            ) : (
              "Escolha uma meta na lista."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup>
            <Field
              data-invalid={form.formState.errors.accountId ? true : undefined}
            >
              <FieldLabel htmlFor="contribution-account">Conta de origem</FieldLabel>
              <Controller
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="contribution-account"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.accountId}
                    >
                      <SelectValue placeholder="Selecione a conta" />
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
              <FieldDescription>
                Registramos uma despesa nessa conta (categoria &quot;Meta / cofrinho&quot;,
                criada automaticamente se ainda não existir).
              </FieldDescription>
              <FieldError errors={[form.formState.errors.accountId]} />
            </Field>

            <Field data-invalid={form.formState.errors.amount ? true : undefined}>
              <FieldLabel htmlFor="contribution-amount">Valor</FieldLabel>
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <Input
                    id="contribution-amount"
                    inputMode="numeric"
                    placeholder="0,00"
                    autoComplete="off"
                    value={field.value}
                    onChange={(e) => field.onChange(maskCurrencyInputBR(e.target.value))}
                  />
                )}
              />
              {goal ? (
                <p className="text-muted-foreground text-xs">
                  Meta do mês: {formatCurrencyBRL(goal.monthlyTargetAmount)}
                </p>
              ) : null}
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>

            <Field data-invalid={form.formState.errors.date ? true : undefined}>
              <FieldLabel>Data</FieldLabel>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    aria-invalid={!!form.formState.errors.date}
                  >
                    <CalendarIcon className="size-4 shrink-0 opacity-70" />
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
              <input
                type="hidden"
                {...form.register("date")}
              />
              <FieldError errors={[form.formState.errors.date]} />
            </Field>

            <Controller
              control={form.control}
              name="note"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="contribution-note">Observação (opcional)</FieldLabel>
                  <Textarea
                    id="contribution-note"
                    rows={2}
                    placeholder="Ex.: 13º salário, sobra do mês…"
                    className="resize-none"
                    {...field}
                  />
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                !goal ||
                activeAccounts.length === 0 ||
                form.formState.isSubmitting
              }
            >
              {form.formState.isSubmitting ? <Spinner className="size-4" /> : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
