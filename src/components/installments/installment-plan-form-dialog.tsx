import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, PencilIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { firstActiveAccountId } from "@/lib/account-ui"
import { cardSupportsPaymentMethod } from "@/lib/card-ui"
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { todayISODate } from "@/lib/transaction-ui"
import { categoryAcceptsTransactionType } from "@/services/category-service"
import type { Account } from "@/types/account"
import type { Card } from "@/types/card"
import type { Category } from "@/types/category"
import type {
  CreateInstallmentPlanInput,
  InstallmentPlan,
  UpdateInstallmentPlanInput,
} from "@/types/installment"
import type { TransactionType } from "@/types/transaction"

const formSchema = z.object({
  title: z.string().trim().min(1, "Informe o título."),
  logoDataUrl: z.string(),
  totalAmount: z
    .string()
    .trim()
    .min(1, "Informe o valor total.")
    .refine((v) => parseCurrencyInputBR(v) !== null, "Valor inválido."),
  installmentCount: z
    .string()
    .trim()
    .min(1, "Informe a quantidade de parcelas."),
  firstDueDate: z.string().trim().min(1, "Informe a data da primeira parcela."),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().trim().min(1, "Selecione a categoria."),
  paymentMethod: z.enum(["pix", "debit_card", "credit_card", "boleto", "cash"]),
  accountId: z.string().trim().min(1, "Selecione a conta."),
  cardId: z.string().optional(),
  description: z.string(),
})

type FormValues = z.infer<typeof formSchema>

function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((n) => Number(n))
  return new Date(year, month - 1, day)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."))
    reader.readAsDataURL(file)
  })
}

function firstCategoryIdForType(categories: Category[], type: TransactionType): string {
  const c = categories.find((cat) => categoryAcceptsTransactionType(cat, type))
  return c?.id ?? ""
}

function defaultValues(
  plan: InstallmentPlan | null,
  categories: Category[],
  accounts: Account[]
): FormValues {
  if (!plan) {
    const type: TransactionType = "expense"
    return {
      title: "",
      logoDataUrl: "",
      totalAmount: "",
      installmentCount: "2",
      firstDueDate: todayISODate(),
      type,
      categoryId: firstCategoryIdForType(categories, type),
      paymentMethod: "pix",
      accountId: firstActiveAccountId(accounts),
      cardId: "",
      description: "",
    }
  }
  return {
    title: plan.title,
    logoDataUrl: plan.logoDataUrl,
    totalAmount: formatCurrencyInputBRFromNumber(plan.totalAmount),
    installmentCount: String(plan.installmentCount),
    firstDueDate: plan.installments[0]?.dueDate ?? todayISODate(),
    type: plan.type,
    categoryId: plan.categoryId,
    paymentMethod: plan.paymentMethod,
    accountId: plan.accountId,
    cardId: plan.cardId ?? "",
    description: plan.description,
  }
}

export function InstallmentPlanFormDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  cards,
  planToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  accounts: Account[]
  cards: Card[]
  planToEdit: InstallmentPlan | null
  onCreate: (input: CreateInstallmentPlanInput) => void
  onUpdate: (input: UpdateInstallmentPlanInput) => InstallmentPlan | null
}) {
  const isEdit = planToEdit !== null
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [firstDueDatePickerOpen, setFirstDueDatePickerOpen] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(planToEdit, categories, accounts),
  })

  const txType = useWatch({ control: form.control, name: "type" }) ?? "expense"
  const paymentMethod =
    useWatch({ control: form.control, name: "paymentMethod" }) ?? "pix"
  const needsCard = paymentMethod === "credit_card"

  const compatibleCategories = useMemo(
    () => categories.filter((c) => categoryAcceptsTransactionType(c, txType)),
    [categories, txType]
  )
  const compatibleAccounts = useMemo(
    () => accounts.filter((a) => a.active),
    [accounts]
  )
  const compatibleCards = useMemo(
    () =>
      cards.filter(
        (card) => card.active && cardSupportsPaymentMethod(card, paymentMethod)
      ),
    [cards, paymentMethod]
  )

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(planToEdit, categories, accounts))
    }
  }, [open, planToEdit, categories, accounts, form])

  useEffect(() => {
    const current = form.getValues("categoryId")
    if (!compatibleCategories.some((c) => c.id === current)) {
      form.setValue("categoryId", compatibleCategories[0]?.id ?? "")
    }
  }, [compatibleCategories, form])

  useEffect(() => {
    const current = form.getValues("accountId")
    if (!compatibleAccounts.some((a) => a.id === current)) {
      form.setValue("accountId", compatibleAccounts[0]?.id ?? "")
    }
  }, [compatibleAccounts, form])

  useEffect(() => {
    if (!needsCard) {
      form.setValue("cardId", "")
      return
    }
    const current = form.getValues("cardId")
    if (!compatibleCards.some((c) => c.id === current)) {
      form.setValue("cardId", compatibleCards[0]?.id ?? "")
    }
  }, [compatibleCards, form, needsCard])

  const onSubmit = form.handleSubmit((values) => {
    const totalAmount = parseCurrencyInputBR(values.totalAmount)
    if (totalAmount === null) {
      form.setError("totalAmount", { message: "Valor inválido." })
      return
    }
    const installmentCount = Number(values.installmentCount)
    if (!Number.isFinite(installmentCount) || installmentCount < 1) {
      form.setError("installmentCount", { message: "Quantidade inválida." })
      return
    }

    try {
      if (planToEdit) {
        const next = onUpdate({
          id: planToEdit.id,
          title: values.title.trim(),
          logoDataUrl: values.logoDataUrl,
          totalAmount,
          type: values.type,
          categoryId: values.categoryId.trim(),
          paymentMethod: values.paymentMethod,
          accountId: values.accountId.trim(),
          cardId: values.cardId?.trim() || undefined,
          description: values.description.trim(),
        })
        if (!next) {
          toast.error("Não foi possível atualizar o parcelamento.")
          return
        }
        toast.success("Parcelamento atualizado.")
      } else {
        onCreate({
          title: values.title.trim(),
          logoDataUrl: values.logoDataUrl,
          totalAmount,
          installmentCount: Math.floor(installmentCount),
          firstDueDate: values.firstDueDate.trim(),
          type: values.type,
          categoryId: values.categoryId.trim(),
          paymentMethod: values.paymentMethod,
          accountId: values.accountId.trim(),
          cardId: values.cardId?.trim() || undefined,
          description: values.description.trim(),
        })
        toast.success("Parcelamento criado.")
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.")
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar parcelamento" : "Novo parcelamento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "A edição altera dados de classificação e pagamento, sem recriar parcelas."
              : "Crie um plano parcelado com geração automática das parcelas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="title">Título</FieldLabel>
              <Input id="title" {...form.register("title")} />
              <FieldError errors={[form.formState.errors.title]} />
            </Field>

            <Field className="sm:col-span-2">
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
                        err instanceof Error ? err.message : "Falha ao carregar imagem."
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
                        form.setValue("logoDataUrl", "", { shouldDirty: true })
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
                A logo aparece na lista de parcelamentos ao lado do título.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="totalAmount">Valor total</FieldLabel>
              <Controller
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <Input
                    id="totalAmount"
                    inputMode="numeric"
                    value={field.value}
                    onChange={(e) => field.onChange(maskCurrencyInputBR(e.target.value))}
                  />
                )}
              />
              <FieldError errors={[form.formState.errors.totalAmount]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="installmentCount">Qtd. parcelas</FieldLabel>
              <Input
                id="installmentCount"
                type="number"
                min={1}
                disabled={isEdit}
                {...form.register("installmentCount")}
              />
              <FieldError errors={[form.formState.errors.installmentCount]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="firstDueDate">Primeiro vencimento</FieldLabel>
              <Controller
                control={form.control}
                name="firstDueDate"
                render={({ field }) => (
                  <Popover
                    open={firstDueDatePickerOpen && !isEdit}
                    onOpenChange={(nextOpen) => {
                      if (isEdit) return
                      setFirstDueDatePickerOpen(nextOpen)
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="firstDueDate"
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2"
                        disabled={isEdit}
                      >
                        <CalendarIcon data-icon="inline-start" />
                        {field.value
                          ? isoDateToLocalDate(field.value).toLocaleDateString("pt-BR")
                          : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? isoDateToLocalDate(field.value) : undefined}
                        onSelect={(date) => {
                          if (!date) return
                          field.onChange(format(date, "yyyy-MM-dd"))
                          setFirstDueDatePickerOpen(false)
                        }}
                        weekStartsOn={1}
                        showOutsideDays
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              <FieldError errors={[form.formState.errors.firstDueDate]} />
            </Field>

            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Saída</SelectItem>
                      <SelectItem value="income">Entrada</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field>
              <FieldLabel>Categoria</FieldLabel>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {compatibleCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.categoryId]} />
            </Field>

            <Field>
              <FieldLabel>Pagamento</FieldLabel>
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="debit_card">Cartão de débito</SelectItem>
                      <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field>
              <FieldLabel>Conta</FieldLabel>
              <Controller
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
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
              <Field className="sm:col-span-2">
                <FieldLabel>Cartão</FieldLabel>
                <Controller
                  control={form.control}
                  name="cardId"
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleCards.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : null}

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="description">Descrição</FieldLabel>
              <Textarea id="description" rows={3} {...form.register("description")} />
            </Field>
          </FieldGroup>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || uploadingLogo}>
              {isEdit ? <PencilIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              {isEdit ? "Salvar alterações" : "Criar parcelamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
