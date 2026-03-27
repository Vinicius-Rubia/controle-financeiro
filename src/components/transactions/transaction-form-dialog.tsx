import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, PencilIcon, PlusIcon } from "lucide-react"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { firstActiveAccountId } from "@/lib/account-ui"
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { statementSummariesForCard } from "@/lib/credit-statement"
import { cardSupportsPaymentMethod } from "@/lib/card-ui"
import { formatCurrencyBRL } from "@/lib/format-currency"
import {
  formatTransactionDate,
  todayISODate,
} from "@/lib/transaction-ui"
import { cn } from "@/lib/utils"
import { categoryAcceptsTransactionType } from "@/services/category-service"
import type { Account } from "@/types/account"
import type { Card } from "@/types/card"
import type { Category } from "@/types/category"
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from "@/types/transaction"

function firstCategoryIdForType(
  categories: Category[],
  type: TransactionType
): string {
  const c = categories.find((cat) => categoryAcceptsTransactionType(cat, type))
  return c?.id ?? ""
}

const transactionFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título."),
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor.")
    .refine(
      (s) => parseCurrencyInputBR(s) !== null,
      "Valor deve ser maior que zero."
    ),
  type: z.enum(["income", "expense"]),
  paymentMethod: z.enum([
    "pix",
    "debit_card",
    "credit_card",
    "boleto",
    "cash",
    "credit_card_settlement",
  ]),
  accountId: z.string().min(1, "Selecione a conta."),
  cardId: z.string().optional(),
  statementPeriodKey: z.string().optional(),
  categoryId: z.string().optional(),
  date: z.string().min(1, "Informe a data."),
  description: z.string(),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((n) => Number(n))
  return new Date(year, month - 1, day)
}

function defaultValues(
  transaction: Transaction | null,
  categories: Category[],
  accounts: Account[]
): TransactionFormValues {
  if (!transaction) {
    const type: TransactionType = "expense"
    return {
      title: "",
      amount: "",
      type,
      paymentMethod: "pix",
      accountId: firstActiveAccountId(accounts),
      cardId: "",
      categoryId: firstCategoryIdForType(categories, type),
      date: todayISODate(),
      description: "",
      statementPeriodKey: "",
    }
  }
  return {
    title: transaction.title,
    amount: formatCurrencyInputBRFromNumber(transaction.amount),
    type: transaction.type,
    paymentMethod: transaction.paymentMethod,
    accountId: transaction.accountId ?? "",
    cardId: transaction.cardId ?? "",
    statementPeriodKey: transaction.statementPeriodKey ?? "",
    categoryId: transaction.categoryId,
    date: transaction.date,
    description: transaction.description,
  }
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  cards,
  transactions,
  transactionToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  accounts: Account[]
  cards: Card[]
  transactions: Transaction[]
  transactionToEdit: Transaction | null
  onCreate: (input: CreateTransactionInput) => void
  onUpdate: (input: UpdateTransactionInput) => Transaction | null
}) {
  const isEdit = transactionToEdit !== null

  const [dateOpen, setDateOpen] = useState(false)

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultValues(transactionToEdit, categories, accounts),
  })

  const txType =
    useWatch({ control: form.control, name: "type" }) ?? "expense"
  const paymentMethod =
    useWatch({ control: form.control, name: "paymentMethod" }) ?? "pix"
  const cardIdWatched =
    useWatch({ control: form.control, name: "cardId" }) ?? ""
  const statementPeriodKeyWatched =
    useWatch({ control: form.control, name: "statementPeriodKey" }) ?? ""
  const txDate = useWatch({ control: form.control, name: "date" })

  const compatibleCategories = useMemo(
    () => categories.filter((c) => categoryAcceptsTransactionType(c, txType)),
    [categories, txType]
  )

  const orphanCategoryId =
    isEdit &&
    transactionToEdit &&
    !categories.some((c) => c.id === transactionToEdit.categoryId)
      ? transactionToEdit.categoryId
      : null

  const compatibleAccounts = useMemo(
    () => accounts.filter((a) => a.active),
    [accounts]
  )
  const orphanAccountId =
    isEdit &&
    transactionToEdit &&
    transactionToEdit.accountId &&
    !accounts.some((a) => a.id === transactionToEdit.accountId)
      ? transactionToEdit.accountId
      : null

  const needsCard =
    paymentMethod === "credit_card" ||
    paymentMethod === "credit_card_settlement"
  const compatibleCards = useMemo(
    () =>
      cards.filter((card) => {
        if (!card.active) return false
        return cardSupportsPaymentMethod(card, paymentMethod)
      }),
    [cards, paymentMethod]
  )
  const orphanCardId =
    isEdit &&
    transactionToEdit &&
    transactionToEdit.cardId &&
    !cards.some((c) => c.id === transactionToEdit.cardId)
      ? transactionToEdit.cardId
      : null

  const needsSettlement = paymentMethod === "credit_card_settlement"

  const settlementOptions = useMemo(() => {
    if (!needsSettlement || !cardIdWatched) return []
    const card = cards.find((c) => c.id === cardIdWatched)
    if (!card) return []
    return statementSummariesForCard(transactions, card).filter(
      (s) => s.outstanding > 0
    )
  }, [needsSettlement, cardIdWatched, cards, transactions])
  const selectedSettlementOutstanding = useMemo(() => {
    if (!needsSettlement) return null
    const key = statementPeriodKeyWatched.trim()
    if (!key) return null
    const row = settlementOptions.find((s) => s.closingDateIso === key)
    if (!row) return null
    return row.outstanding
  }, [needsSettlement, statementPeriodKeyWatched, settlementOptions])

  const orphanStatementKey =
    isEdit &&
    transactionToEdit &&
    transactionToEdit.statementPeriodKey &&
    needsSettlement &&
    !settlementOptions.some(
      (s) => s.closingDateIso === transactionToEdit.statementPeriodKey
    )
      ? transactionToEdit.statementPeriodKey
      : null

  useEffect(() => {
    if (paymentMethod === "credit_card_settlement") {
      form.setValue("type", "expense", { shouldValidate: true })
    }
  }, [paymentMethod, form])

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(transactionToEdit, categories, accounts))
    }
  }, [open, transactionToEdit, categories, accounts, form])

  useEffect(() => {
    if (paymentMethod === "credit_card_settlement") {
      const card = cards.find((c) => c.id === cardIdWatched)
      const link = card?.accountId
      if (link && compatibleAccounts.some((a) => a.id === link)) {
        form.setValue("accountId", link, { shouldValidate: true })
        return
      }
    }
    const current = form.getValues("accountId") ?? ""
    const exists = compatibleAccounts.some((a) => a.id === current)
    if (!exists && !orphanAccountId) {
      form.setValue("accountId", compatibleAccounts[0]?.id ?? "", {
        shouldValidate: true,
      })
    }
  }, [paymentMethod, cardIdWatched, cards, form, compatibleAccounts, orphanAccountId])

  useEffect(() => {
    if (!needsCard) {
      form.setValue("cardId", "", { shouldValidate: true })
      return
    }
    const current = form.getValues("cardId") ?? ""
    const exists = compatibleCards.some((c) => c.id === current)
    if (!exists && !orphanCardId) {
      form.setValue("cardId", compatibleCards[0]?.id ?? "", {
        shouldValidate: true,
      })
    }
  }, [needsCard, form, compatibleCards, orphanCardId])

  useEffect(() => {
    if (!needsSettlement) {
      form.setValue("statementPeriodKey", "", { shouldValidate: true })
      return
    }
    const cur = form.getValues("statementPeriodKey") ?? ""
    const ok =
      settlementOptions.some((s) => s.closingDateIso === cur) ||
      (orphanStatementKey !== null && cur === orphanStatementKey)
    if (!ok && settlementOptions[0]) {
      form.setValue("statementPeriodKey", settlementOptions[0].closingDateIso, {
        shouldValidate: true,
      })
    }
  }, [
    needsSettlement,
    form,
    settlementOptions,
    orphanStatementKey,
  ])

  useEffect(() => {
    const cid = form.getValues("categoryId")
    const orphanStillValid =
      orphanCategoryId !== null &&
      cid === orphanCategoryId &&
      transactionToEdit !== null &&
      transactionToEdit.type === txType

    const ok =
      compatibleCategories.some((c) => c.id === cid) || orphanStillValid

    if (!ok) {
      form.setValue("categoryId", firstCategoryIdForType(categories, txType), {
        shouldValidate: true,
      })
    }
  }, [
    txType,
    compatibleCategories,
    categories,
    form,
    orphanCategoryId,
    transactionToEdit,
  ])

  const onSubmit = form.handleSubmit(async (values) => {
    await new Promise((r) => requestAnimationFrame(r))

    const amount = parseCurrencyInputBR(values.amount)
    if (amount === null) {
      form.setError("amount", { message: "Valor deve ser maior que zero." })
      return
    }
    if (
      values.paymentMethod === "credit_card_settlement" &&
      selectedSettlementOutstanding !== null &&
      amount > selectedSettlementOutstanding
    ) {
      form.setError("amount", {
        message: `Valor acima do em aberto (${formatCurrencyBRL(selectedSettlementOutstanding)}).`,
      })
      return
    }

    const payloadBase = {
      title: values.title.trim(),
      amount,
      type: values.type,
      paymentMethod: values.paymentMethod,
      accountId: values.accountId.trim(),
      cardId: values.cardId?.trim() || undefined,
      statementPeriodKey: values.statementPeriodKey?.trim() || undefined,
      categoryId:
        values.paymentMethod === "credit_card_settlement"
          ? undefined
          : values.categoryId?.trim() || undefined,
      date: values.date,
      description: values.description.trim(),
    }

    try {
      if (transactionToEdit) {
        const next = onUpdate({
          id: transactionToEdit.id,
          ...payloadBase,
        })
        if (next === null) {
          toast.error(
            "Não foi possível atualizar. Verifique a categoria e o tipo."
          )
          return
        }
        toast.success("Lançamento atualizado.")
      } else {
        onCreate(payloadBase)
        toast.success("Lançamento criado.")
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível salvar o lançamento."
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[90dvh] w-full max-w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 px-4 pt-4 pr-12 text-left sm:px-6">
          <DialogTitle>
            {isEdit ? "Editar lançamento" : "Novo lançamento"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do lançamento. O valor deve ser maior que zero e a
            categoria precisa ser compatível com o tipo (entrada ou saída).
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field
              className="min-w-0 sm:col-span-2"
              data-invalid={form.formState.errors.title ? true : undefined}
            >
              <FieldLabel htmlFor="tx-title">Título</FieldLabel>
              <Input
                id="tx-title"
                autoComplete="off"
                placeholder="Ex.: Salário março"
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
              />
              <FieldError errors={[form.formState.errors.title]} />
            </Field>

            <Field
              className="min-w-0"
              data-invalid={form.formState.errors.amount ? true : undefined}
            >
                <FieldLabel htmlFor="tx-amount">Valor (R$)</FieldLabel>
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="tx-amount"
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
                  A vírgula é aplicada automaticamente conforme digita.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.amount]} />
            </Field>

            <Field
              className="min-w-0"
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
                        {txDate ? (
                          isoDateToLocalDate(txDate).toLocaleDateString("pt-BR")
                        ) : (
                          "Selecione a data"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div
                      className={
                        form.formState.isSubmitting
                          ? "pointer-events-none opacity-60"
                          : undefined
                      }
                    >
                      <Calendar
                        mode="single"
                        selected={txDate ? isoDateToLocalDate(txDate) : undefined}
                        onSelect={(d) => {
                          if (!d) return
                          form.setValue("date", format(d, "yyyy-MM-dd"), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                          setDateOpen(false)
                        }}
                        weekStartsOn={1}
                        showOutsideDays
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <input
                  type="date"
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  {...form.register("date")}
                />
                <FieldError errors={[form.formState.errors.date]} />
            </Field>

            <Field
              className="min-w-0"
              data-invalid={form.formState.errors.type ? true : undefined}
            >
              <FieldLabel>Tipo</FieldLabel>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    className="w-full justify-stretch *:flex-1"
                    value={field.value}
                    onValueChange={(v) => {
                      if (v) field.onChange(v as TransactionType)
                    }}
                  >
                    <ToggleGroupItem value="income" disabled={needsSettlement}>
                      Entrada
                    </ToggleGroupItem>
                    <ToggleGroupItem value="expense">Saída</ToggleGroupItem>
                  </ToggleGroup>
                )}
              />
              <FieldError errors={[form.formState.errors.type]} />
            </Field>

            <Field
              className="min-w-0"
              data-invalid={
                form.formState.errors.paymentMethod ? true : undefined
              }
            >
              <FieldLabel htmlFor="tx-payment">Meio de pagamento</FieldLabel>
              <Controller
                name="paymentMethod"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="tx-payment"
                      className="w-full min-w-0"
                      aria-invalid={!!form.formState.errors.paymentMethod}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="pix">Pix</SelectItem>
                        <SelectItem value="debit_card">
                          Cartão de débito
                        </SelectItem>
                        <SelectItem value="credit_card">
                          Cartão de crédito
                        </SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="credit_card_settlement">
                          Pagamento de fatura
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                errors={[form.formState.errors.paymentMethod]}
              />
            </Field>

            <Field
              className="min-w-0 sm:col-span-2"
              data-invalid={form.formState.errors.accountId ? true : undefined}
            >
              <FieldLabel htmlFor="tx-account">Conta</FieldLabel>
              <Controller
                name="accountId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="tx-account"
                      className="w-full min-w-0"
                      aria-invalid={!!form.formState.errors.accountId}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {orphanAccountId ? (
                        <SelectItem value={orphanAccountId} disabled>
                          Conta removida — escolha outra
                        </SelectItem>
                      ) : null}
                      {compatibleAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription className="text-xs">
                Obrigatória em todo lançamento. No crédito, o caixa só muda no
                pagamento da fatura. Em “Pagamento de fatura”, categoria não se
                aplica.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.accountId]} />
            </Field>

            {needsCard ? (
              <Field
                className="min-w-0"
                data-invalid={form.formState.errors.cardId ? true : undefined}
              >
                <FieldLabel htmlFor="tx-card">Cartão</FieldLabel>
                <Controller
                  name="cardId"
                  control={form.control}
                  rules={{
                    validate: (value) =>
                      !needsCard || Boolean(value) || "Selecione um cartão.",
                  }}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="tx-card"
                        className="w-full min-w-0"
                        aria-invalid={!!form.formState.errors.cardId}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {orphanCardId ? (
                          <SelectItem value={orphanCardId} disabled>
                            Cartão removido — escolha outro
                          </SelectItem>
                        ) : null}
                        {compatibleCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.cardId]} />
              </Field>
            ) : null}

            {needsSettlement ? (
              <Field
                className="min-w-0"
                data-invalid={
                  form.formState.errors.statementPeriodKey ? true : undefined
                }
              >
                <FieldLabel htmlFor="tx-statement">Fatura (fechamento)</FieldLabel>
                <Controller
                  name="statementPeriodKey"
                  control={form.control}
                  rules={{
                    validate: (value) =>
                      !needsSettlement ||
                      Boolean(value?.trim()) ||
                      "Selecione a fatura com valor em aberto.",
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={settlementOptions.length === 0 && !orphanStatementKey}
                    >
                      <SelectTrigger
                        id="tx-statement"
                        className="w-full min-w-0"
                        aria-invalid={!!form.formState.errors.statementPeriodKey}
                      >
                        <SelectValue
                          placeholder={
                            settlementOptions.length === 0
                              ? "Nenhuma fatura em aberto"
                              : "Selecione"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {orphanStatementKey ? (
                          <SelectItem value={orphanStatementKey} disabled>
                            Fatura quitada ou inválida — escolha outra
                          </SelectItem>
                        ) : null}
                        {settlementOptions.map((s) => (
                          <SelectItem key={s.closingDateIso} value={s.closingDateIso}>
                            Fecha {formatTransactionDate(s.closingDateIso)} · em
                            aberto {formatCurrencyBRL(s.outstanding)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription className="text-xs">
                  Só aparecem períodos com saldo a pagar neste cartão.
                </FieldDescription>
                <FieldError
                  errors={[form.formState.errors.statementPeriodKey]}
                />
              </Field>
            ) : null}

            {!needsSettlement ? (
              <Field
                className="min-w-0"
                data-invalid={
                  form.formState.errors.categoryId ? true : undefined
                }
              >
                <FieldLabel htmlFor="tx-category">Categoria</FieldLabel>
                <Controller
                  name="categoryId"
                  control={form.control}
                  rules={{
                    validate: (value) =>
                      needsSettlement ||
                      Boolean(value?.trim()) ||
                      "Selecione uma categoria.",
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="tx-category"
                        className="w-full min-w-0"
                        aria-invalid={!!form.formState.errors.categoryId}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {orphanCategoryId ? (
                            <SelectItem value={orphanCategoryId} disabled>
                              Categoria removida — escolha outra
                            </SelectItem>
                          ) : null}
                          {compatibleCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.categoryId]} />
              </Field>
            ) : null}

            <Field
              className="min-w-0 sm:col-span-2"
              data-invalid={
                form.formState.errors.description ? true : undefined
              }
            >
              <FieldLabel htmlFor="tx-desc">Descrição</FieldLabel>
              <Textarea
                id="tx-desc"
                rows={3}
                placeholder="Opcional"
                aria-invalid={!!form.formState.errors.description}
                {...form.register("description")}
              />
              <FieldError errors={[form.formState.errors.description]} />
            </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="bg-background/98 supports-backdrop-filter:backdrop-blur-xs shrink-0 gap-2 border-t px-4 py-3 sm:px-6 sm:justify-end">
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
              ) : isEdit ? (
                <PencilIcon data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
