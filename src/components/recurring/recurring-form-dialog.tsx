import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react"
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
import { cardSupportsPaymentMethod } from "@/lib/card-ui"
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { weekdayLabel } from "@/lib/recurring-ui"
import { cn } from "@/lib/utils"
import { categoryAcceptsTransactionType } from "@/services/category-service"
import type { Account } from "@/types/account"
import type { Card } from "@/types/card"
import type { Category } from "@/types/category"
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  UpdateRecurringRuleInput,
} from "@/types/recurring"
import type { PaymentMethod, TransactionType } from "@/types/transaction"

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."))
    reader.readAsDataURL(file)
  })
}

function firstCategoryIdForType(
  categories: Category[],
  type: TransactionType
): string {
  const c = categories.find((cat) => categoryAcceptsTransactionType(cat, type))
  return c?.id ?? ""
}

/** Recorrência não usa pagamento de fatura; dados legados são coerced. */
function recurringPaymentMethodForForm(
  pm: PaymentMethod
): "pix" | "debit_card" | "credit_card" | "boleto" | "cash" {
  if (pm === "credit_card_settlement") return "pix"
  if (pm === "debit_card") return "debit_card"
  if (pm === "credit_card") return "credit_card"
  if (pm === "boleto") return "boleto"
  if (pm === "cash") return "cash"
  return "pix"
}

const recurringFormSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título."),
    logoDataUrl: z.string(),
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
    ]),
    accountId: z.string().min(1, "Selecione a conta."),
    cardId: z.string().optional(),
    categoryId: z.string().min(1, "Selecione uma categoria."),
    description: z.string(),
    frequency: z.enum(["monthly", "weekly"]),
    dayOfMonth: z.string(),
    weekday: z.string(),
    active: z.boolean(),
    autoPost: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "monthly") {
      const d = Number(data.dayOfMonth)
      if (!Number.isFinite(d) || d < 1 || d > 31) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dia do mês deve ser entre 1 e 31.",
          path: ["dayOfMonth"],
        })
      }
    } else {
      const w = Number(data.weekday)
      if (!Number.isFinite(w) || w < 0 || w > 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione o dia da semana.",
          path: ["weekday"],
        })
      }
    }
  })

type RecurringFormValues = z.infer<typeof recurringFormSchema>

function defaultValues(
  rule: RecurringRule | null,
  categories: Category[],
  accounts: Account[]
): RecurringFormValues {
  if (!rule) {
    const type: TransactionType = "expense"
    const today = new Date()
    return {
      title: "",
      logoDataUrl: "",
      amount: "",
      type,
      paymentMethod: "pix",
      accountId: firstActiveAccountId(accounts),
      cardId: "",
      categoryId: firstCategoryIdForType(categories, type),
      description: "",
      frequency: "monthly",
      dayOfMonth: String(today.getDate()),
      weekday: String(today.getDay()),
      active: true,
      autoPost: false,
    }
  }
  return {
    title: rule.title,
    logoDataUrl: rule.logoDataUrl,
    amount: formatCurrencyInputBRFromNumber(rule.amount),
    type: rule.type,
    paymentMethod: recurringPaymentMethodForForm(rule.paymentMethod),
    accountId: rule.accountId ?? "",
    cardId: rule.cardId ?? "",
    categoryId: rule.categoryId,
    description: rule.description,
    frequency: rule.frequency,
    dayOfMonth: rule.dayOfMonth != null ? String(rule.dayOfMonth) : "1",
    weekday: rule.weekday != null ? String(rule.weekday) : "0",
    active: rule.active,
    autoPost: rule.autoPost,
  }
}

function toCreatePayload(
  values: RecurringFormValues
): CreateRecurringRuleInput {
  const amount = parseCurrencyInputBR(values.amount)
  if (amount === null) {
    throw new Error("Valor inválido.")
  }
  const base = {
    title: values.title.trim(),
    logoDataUrl: values.logoDataUrl,
    amount,
    type: values.type,
    paymentMethod: values.paymentMethod,
    accountId: values.accountId.trim(),
    cardId: values.cardId?.trim() || undefined,
    categoryId: values.categoryId,
    description: values.description.trim(),
    active: values.active,
    autoPost: values.frequency === "monthly" ? values.autoPost : false,
  }
  if (values.frequency === "monthly") {
    return {
      ...base,
      frequency: "monthly",
      dayOfMonth: Number(values.dayOfMonth),
      weekday: undefined,
    }
  }
  return {
    ...base,
    frequency: "weekly",
    weekday: Number(values.weekday),
    dayOfMonth: undefined,
  }
}

export function RecurringFormDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  cards,
  ruleToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  accounts: Account[]
  cards: Card[]
  ruleToEdit: RecurringRule | null
  onCreate: (input: CreateRecurringRuleInput) => void
  onUpdate: (input: UpdateRecurringRuleInput) => RecurringRule | null
}) {
  const isEdit = ruleToEdit !== null
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: defaultValues(ruleToEdit, categories, accounts),
  })

  const txType =
    useWatch({ control: form.control, name: "type" }) ?? "expense"
  const paymentMethod =
    useWatch({ control: form.control, name: "paymentMethod" }) ?? "pix"
  const frequency =
    useWatch({ control: form.control, name: "frequency" }) ?? "monthly"

  const compatibleCategories = useMemo(
    () => categories.filter((c) => categoryAcceptsTransactionType(c, txType)),
    [categories, txType]
  )

  const orphanCategoryId =
    isEdit &&
    ruleToEdit &&
    !categories.some((c) => c.id === ruleToEdit.categoryId)
      ? ruleToEdit.categoryId
      : null

  const compatibleAccounts = useMemo(
    () => accounts.filter((a) => a.active),
    [accounts]
  )
  const orphanAccountId =
    isEdit &&
    ruleToEdit &&
    ruleToEdit.accountId &&
    !accounts.some((a) => a.id === ruleToEdit.accountId)
      ? ruleToEdit.accountId
      : null

  const needsCard = paymentMethod === "credit_card"
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
    ruleToEdit &&
    ruleToEdit.cardId &&
    !cards.some((c) => c.id === ruleToEdit.cardId)
      ? ruleToEdit.cardId
      : null

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(ruleToEdit, categories, accounts))
    }
  }, [open, ruleToEdit, categories, accounts, form])

  useEffect(() => {
    if (frequency === "weekly") {
      form.setValue("autoPost", false, { shouldValidate: true })
    }
  }, [frequency, form])

  useEffect(() => {
    const current = form.getValues("accountId") ?? ""
    const exists = compatibleAccounts.some((a) => a.id === current)
    if (!exists && !orphanAccountId) {
      form.setValue("accountId", compatibleAccounts[0]?.id ?? "", {
        shouldValidate: true,
      })
    }
  }, [form, compatibleAccounts, orphanAccountId])

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
    const cid = form.getValues("categoryId")
    const orphanStillValid =
      orphanCategoryId !== null &&
      cid === orphanCategoryId &&
      ruleToEdit !== null &&
      ruleToEdit.type === txType

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
    ruleToEdit,
  ])

  const onSubmit = form.handleSubmit(async (values) => {
    await new Promise((r) => requestAnimationFrame(r))

    const amount = parseCurrencyInputBR(values.amount)
    if (amount === null) {
      form.setError("amount", { message: "Valor deve ser maior que zero." })
      return
    }

    try {
      if (ruleToEdit) {
        const payload: UpdateRecurringRuleInput = {
          id: ruleToEdit.id,
          ...toCreatePayload(values),
        }
        const next = onUpdate(payload)
        if (next === null) {
          toast.error(
            "Não foi possível atualizar. Verifique a categoria, o cartão e a periodicidade."
          )
          return
        }
        toast.success("Recorrência atualizada.")
      } else {
        onCreate(toCreatePayload(values))
        toast.success("Recorrência criada.")
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível salvar a recorrência."
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
            {isEdit ? "Editar recorrência" : "Nova recorrência"}
          </DialogTitle>
          <DialogDescription className="text-balance">
            Modelo de lançamento e periodicidade. Use “Lançar” na lista ou o
            lançamento automático (mensal) ao abrir o app.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field
                className="min-w-0 sm:col-span-1"
                data-invalid={form.formState.errors.title ? true : undefined}
              >
                <FieldLabel htmlFor="rec-title">Título</FieldLabel>
                <Input
                  id="rec-title"
                  autoComplete="off"
                  placeholder="Ex.: Aluguel, Netflix"
                  aria-invalid={!!form.formState.errors.title}
                  {...form.register("title")}
                />
                <FieldError errors={[form.formState.errors.title]} />
              </Field>

              <Field
                className="min-w-0 sm:col-span-1"
                data-invalid={form.formState.errors.amount ? true : undefined}
              >
                <FieldLabel htmlFor="rec-amount">Valor (R$)</FieldLabel>
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="rec-amount"
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
                <FieldDescription className="text-xs">
                  A vírgula é aplicada automaticamente conforme digita.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.amount]} />
              </Field>

              <Field className="min-w-0 sm:col-span-2">
                <FieldLabel>Logo (opcional)</FieldLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingLogo(true)
                      try {
                        const dataUrl = await readFileAsDataUrl(file)
                        form.setValue("logoDataUrl", dataUrl, { shouldDirty: true })
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Falha ao carregar imagem."
                        )
                      } finally {
                        setUploadingLogo(false)
                      }
                    }}
                  />
                  {uploadingLogo ? <Spinner /> : null}
                  {form.watch("logoDataUrl") ? (
                    <>
                      <img
                        src={form.watch("logoDataUrl")}
                        alt=""
                        className="size-10 rounded-md border object-cover"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          form.setValue("logoDataUrl", "", {
                            shouldDirty: true,
                          })
                        }
                      >
                        <XIcon />
                      </Button>
                    </>
                  ) : (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <UploadIcon className="size-3" />
                      Sem logo
                    </span>
                  )}
                </div>
                <FieldDescription className="text-xs">
                  Aparece na lista de recorrências ao lado do título.
                </FieldDescription>
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
                      <ToggleGroupItem value="income">Entrada</ToggleGroupItem>
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
                <FieldLabel htmlFor="rec-payment">Meio de pagamento</FieldLabel>
                <Controller
                  name="paymentMethod"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="rec-payment"
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
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.paymentMethod]} />
              </Field>

              <Field
                className="min-w-0"
                data-invalid={
                  form.formState.errors.accountId ? true : undefined
                }
              >
                <FieldLabel htmlFor="rec-account">Conta</FieldLabel>
                <Controller
                  name="accountId"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="rec-account"
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
                <FieldError errors={[form.formState.errors.accountId]} />
              </Field>

              {needsCard ? (
                <Field
                  className="min-w-0"
                  data-invalid={
                    form.formState.errors.cardId ? true : undefined
                  }
                >
                  <FieldLabel htmlFor="rec-card">Cartão</FieldLabel>
                  <Controller
                    name="cardId"
                    control={form.control}
                    rules={{
                      validate: (value) =>
                        !needsCard || Boolean(value) || "Selecione um cartão.",
                    }}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="rec-card"
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

              <Field
                className={cn(
                  "min-w-0",
                  needsCard ? undefined : "sm:col-span-2"
                )}
                data-invalid={
                  form.formState.errors.categoryId ? true : undefined
                }
              >
                <FieldLabel htmlFor="rec-category">Categoria</FieldLabel>
                <Controller
                  name="categoryId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="rec-category"
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

              <Field
                className="min-w-0"
                data-invalid={
                  form.formState.errors.frequency ? true : undefined
                }
              >
                <FieldLabel htmlFor="rec-frequency">Periodicidade</FieldLabel>
                <Controller
                  name="frequency"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="rec-frequency"
                        className="w-full min-w-0"
                        aria-invalid={!!form.formState.errors.frequency}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.frequency]} />
              </Field>

              {frequency === "monthly" ? (
                <Field
                  className="min-w-0"
                  data-invalid={
                    form.formState.errors.dayOfMonth ? true : undefined
                  }
                >
                  <FieldLabel htmlFor="rec-day-month">Dia do mês</FieldLabel>
                  <Input
                    id="rec-day-month"
                    type="number"
                    min={1}
                    max={31}
                    inputMode="numeric"
                    aria-invalid={!!form.formState.errors.dayOfMonth}
                    {...form.register("dayOfMonth")}
                  />
                  <FieldDescription className="text-xs">
                    1–31. O lançamento usa a data escolhida em “Lançar”.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.dayOfMonth]} />
                </Field>
              ) : null}

              {frequency === "monthly" ? (
                <Field
                  className="min-w-0 sm:col-span-2"
                  data-invalid={
                    form.formState.errors.autoPost ? true : undefined
                  }
                >
                  <FieldLabel>Lançamento automático</FieldLabel>
                  <Controller
                    name="autoPost"
                    control={form.control}
                    render={({ field }) => (
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        className="w-full max-w-md justify-stretch *:flex-1 sm:max-w-sm"
                        value={field.value ? "on" : "off"}
                        onValueChange={(v) => {
                          if (v === "on") field.onChange(true)
                          if (v === "off") field.onChange(false)
                        }}
                      >
                        <ToggleGroupItem value="on">Sim</ToggleGroupItem>
                        <ToggleGroupItem value="off">Não</ToggleGroupItem>
                      </ToggleGroup>
                    )}
                  />
                  <FieldDescription className="text-xs">
                    Depois do dia do mês acima, cria uma movimentação ao abrir o
                    app, no máximo uma vez por mês (calendário local).
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.autoPost]} />
                </Field>
              ) : null}

              {frequency === "weekly" ? (
                <Field
                  className="min-w-0"
                  data-invalid={
                    form.formState.errors.weekday ? true : undefined
                  }
                >
                  <FieldLabel htmlFor="rec-weekday">Dia da semana</FieldLabel>
                  <Controller
                    name="weekday"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="rec-weekday"
                          className="w-full min-w-0"
                          aria-invalid={!!form.formState.errors.weekday}
                        >
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                            <SelectItem key={i} value={String(i)}>
                              {weekdayLabel(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.weekday]} />
                </Field>
              ) : null}

              <Field
                className="min-w-0 sm:col-span-2"
                data-invalid={
                  form.formState.errors.active ? true : undefined
                }
              >
                <FieldLabel>Estado</FieldLabel>
                <Controller
                  name="active"
                  control={form.control}
                  render={({ field }) => (
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      className="w-full max-w-md justify-stretch *:flex-1 sm:max-w-sm"
                      value={field.value ? "on" : "off"}
                      onValueChange={(v) => {
                        if (v === "on") field.onChange(true)
                        if (v === "off") field.onChange(false)
                      }}
                    >
                      <ToggleGroupItem value="on">Ativa</ToggleGroupItem>
                      <ToggleGroupItem value="off">Pausada</ToggleGroupItem>
                    </ToggleGroup>
                  )}
                />
                <FieldDescription className="text-xs">
                  Pausadas não podem ser lançadas até reativar.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.active]} />
              </Field>

              <Field
                className="min-w-0 sm:col-span-2"
                data-invalid={
                  form.formState.errors.description ? true : undefined
                }
              >
                <FieldLabel htmlFor="rec-desc">Descrição</FieldLabel>
                <Textarea
                  id="rec-desc"
                  rows={2}
                  placeholder="Opcional"
                  className="min-h-[4.5rem] resize-y"
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
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || uploadingLogo}
            >
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
