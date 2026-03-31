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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  CARD_WALLET_ACCENT_PRESETS,
  isValidWalletAccentHex,
  normalizeWalletAccentHex,
} from "@/lib/card-wallet-accent"
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { cn } from "@/lib/utils"
import { categoryAcceptsTransactionType } from "@/services/category-service"
import type { Category } from "@/types/category"
import type {
  CreatePlannedPaymentInput,
  PlannedPayment,
  UpdatePlannedPaymentInput,
} from "@/types/planned-payment"
import type { TransactionType } from "@/types/transaction"

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const

const nowRef = new Date()
const currentYear = nowRef.getFullYear()
const currentMonth = nowRef.getMonth() + 1
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => currentYear + i)

const formSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título."),
    logoDataUrl: z.string(),
    walletAccentHex: z
      .string()
      .trim()
      .refine((s) => isValidWalletAccentHex(s), "Cor inválida."),
    type: z.enum(["income", "expense"]),
    categoryId: z.string().trim().min(1, "Selecione a categoria."),
    targetMonth: z.string().trim().min(1, "Selecione o mês."),
    targetYear: z.string().trim().min(1, "Selecione o ano."),
    estimatedAmount: z.string(),
    description: z.string(),
  })
  .superRefine((values, ctx) => {
    const year = Number(values.targetYear)
    const month = Number(values.targetMonth)
    if (!Number.isFinite(year) || year < currentYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetYear"],
        message: "Escolha o ano atual ou um ano futuro.",
      })
    }
    if (
      Number.isFinite(year) &&
      year === currentYear &&
      Number.isFinite(month) &&
      month < currentMonth
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetMonth"],
        message: "No ano atual, escolha o mês atual ou um mês futuro.",
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

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
  planning: PlannedPayment | null,
  categories: Category[]
): FormValues {
  if (!planning) {
    const type: TransactionType = "expense"
    return {
      title: "",
      logoDataUrl: "",
      walletAccentHex: "",
      type,
      categoryId: firstCategoryIdForType(categories, type),
      targetMonth: String(currentMonth),
      targetYear: String(currentYear),
      estimatedAmount: "",
      description: "",
    }
  }
  return {
    title: planning.title,
    logoDataUrl: planning.logoDataUrl ?? "",
    walletAccentHex: normalizeWalletAccentHex(planning.walletAccentHex ?? ""),
    type: planning.type,
    categoryId: planning.categoryId,
    targetMonth: String(planning.targetMonth),
    targetYear: String(planning.targetYear),
    estimatedAmount:
      typeof planning.estimatedAmount === "number"
        ? formatCurrencyInputBRFromNumber(planning.estimatedAmount)
        : "",
    description: planning.description,
  }
}

export function PlannedPaymentFormDialog({
  open,
  onOpenChange,
  categories,
  planningToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  planningToEdit: PlannedPayment | null
  onCreate: (input: CreatePlannedPaymentInput) => void
  onUpdate: (input: UpdatePlannedPaymentInput) => PlannedPayment | null
}) {
  const isEdit = planningToEdit !== null
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(planningToEdit, categories),
  })

  const txType = useWatch({ control: form.control, name: "type" }) ?? "expense"
  const selectedYear = Number(useWatch({ control: form.control, name: "targetYear" }))

  const compatibleCategories = useMemo(
    () => categories.filter((c) => categoryAcceptsTransactionType(c, txType)),
    [categories, txType]
  )
  const monthOptions = useMemo(() => {
    if (selectedYear === currentYear) {
      return MONTHS.map((label, idx) => ({ label, value: idx + 1 })).filter(
        (m) => m.value >= currentMonth
      )
    }
    return MONTHS.map((label, idx) => ({ label, value: idx + 1 }))
  }, [selectedYear])

  useEffect(() => {
    if (!open) return
    form.reset(defaultValues(planningToEdit, categories))
  }, [open, planningToEdit, categories, form])

  useEffect(() => {
    const current = form.getValues("categoryId")
    if (!compatibleCategories.some((c) => c.id === current)) {
      form.setValue("categoryId", compatibleCategories[0]?.id ?? "")
    }
  }, [compatibleCategories, form])

  useEffect(() => {
    const selectedMonth = Number(form.getValues("targetMonth"))
    if (!monthOptions.some((m) => m.value === selectedMonth)) {
      form.setValue("targetMonth", String(monthOptions[0]?.value ?? currentMonth), {
        shouldValidate: true,
      })
    }
  }, [monthOptions, form])

  const submit = form.handleSubmit((values) => {
    try {
      const parsedMonth = Number(values.targetMonth)
      const parsedYear = Number(values.targetYear)
      const estimatedAmountRaw = values.estimatedAmount.trim()
      const estimatedAmount =
        estimatedAmountRaw.length > 0 ? parseCurrencyInputBR(estimatedAmountRaw) : null
      if (estimatedAmountRaw.length > 0 && estimatedAmount === null) {
        form.setError("estimatedAmount", {
          message: "Informe um valor estimado válido.",
        })
        return
      }

      const walletHex = normalizeWalletAccentHex(values.walletAccentHex)

      if (isEdit && planningToEdit) {
        const next = onUpdate({
          id: planningToEdit.id,
          title: values.title.trim(),
          logoDataUrl: values.logoDataUrl,
          walletAccentHex: walletHex,
          type: values.type,
          categoryId: values.categoryId,
          targetMonth: parsedMonth,
          targetYear: parsedYear,
          estimatedAmount: estimatedAmount ?? undefined,
          description: values.description,
        })
        if (!next) {
          toast.error("Não foi possível atualizar o planejamento.")
          return
        }
        toast.success("Planejamento atualizado.")
      } else {
        onCreate({
          title: values.title.trim(),
          logoDataUrl: values.logoDataUrl,
          walletAccentHex: walletHex,
          type: values.type,
          categoryId: values.categoryId,
          targetMonth: parsedMonth,
          targetYear: parsedYear,
          estimatedAmount: estimatedAmount ?? undefined,
          description: values.description,
        })
        toast.success("Planejamento criado.")
      }
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar o planejamento."
      toast.error(message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[90dvh] w-full max-w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 px-4 pt-4 pr-12 text-left sm:px-6">
          <DialogTitle>{isEdit ? "Editar planejamento" : "Novo planejamento"}</DialogTitle>
          <DialogDescription>
            Cadastre uma pendência futura e transforme em lançamento quando decidir pagar.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="planning-title">Nome do planejamento</FieldLabel>
                <Input
                  id="planning-title"
                  placeholder="Ex.: IPVA 2026"
                  {...form.register("title")}
                />
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
                        form.setValue("logoDataUrl", dataUrl, { shouldValidate: true })
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
                          form.setValue("logoDataUrl", "", { shouldValidate: true })
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
                  A logo aparece na lista de planejamentos ao lado do título.
                </FieldDescription>
              </Field>

              <Field
                className="sm:col-span-2"
                data-invalid={
                  form.formState.errors.walletAccentHex ? true : undefined
                }
              >
                <FieldLabel>Cor na carteira</FieldLabel>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={
                        form.watch("walletAccentHex") === "" ? "secondary" : "outline"
                      }
                      size="sm"
                      className="shrink-0"
                      onClick={() =>
                        form.setValue("walletAccentHex", "", { shouldValidate: true })
                      }
                    >
                      Automático
                    </Button>
                    {CARD_WALLET_ACCENT_PRESETS.map((p) => {
                      const active = form.watch("walletAccentHex") === p.hex
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          title={p.label}
                          className={cn(
                            "size-9 shrink-0 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "border-foreground scale-105"
                              : "border-transparent ring-1 ring-foreground/15"
                          )}
                          style={{ backgroundColor: p.hex }}
                          onClick={() =>
                            form.setValue("walletAccentHex", p.hex, {
                              shouldValidate: true,
                            })
                          }
                        />
                      )
                    })}
                    <Controller
                      control={form.control}
                      name="walletAccentHex"
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="planning-wallet-accent"
                            className="border-input h-9 w-14 cursor-pointer overflow-hidden rounded-md border bg-background p-0"
                            value={
                              field.value && field.value.length === 7
                                ? field.value
                                : "#64748b"
                            }
                            onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                            aria-label="Escolher cor personalizada"
                          />
                          <FieldDescription className="text-xs">Personalizada</FieldDescription>
                        </div>
                      )}
                    />
                  </div>
                  <FieldDescription className="text-xs">
                    Automático usa destaque padrão na lista. Ou escolha um tom para a borda do
                    card do planejamento.
                  </FieldDescription>
                </div>
                <FieldError errors={[form.formState.errors.walletAccentHex]} />
              </Field>

              <Field
                className="min-w-0 sm:col-span-2"
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

              <Field className="sm:col-span-2">
                <FieldLabel>Categoria</FieldLabel>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.categoryId]} />
              </Field>

              <Field>
                <FieldLabel>Mês</FieldLabel>
                <Controller
                  control={form.control}
                  name="targetMonth"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.label} value={String(month.value)}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.targetMonth]} />
              </Field>

              <Field>
                <FieldLabel>Ano</FieldLabel>
                <Controller
                  control={form.control}
                  name="targetYear"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.targetYear]} />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel>Valor estimado (opcional)</FieldLabel>
                <Controller
                  control={form.control}
                  name="estimatedAmount"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(maskCurrencyInputBR(e.target.value))}
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  )}
                />
                <FieldError errors={[form.formState.errors.estimatedAmount]} />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="planning-description">Descrição</FieldLabel>
                <Textarea
                  id="planning-description"
                  rows={3}
                  placeholder="Observações (opcional)."
                  {...form.register("description")}
                />
                <FieldError errors={[form.formState.errors.description]} />
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="bg-background/98 supports-backdrop-filter:backdrop-blur-xs shrink-0 gap-2 border-t px-4 py-3 sm:px-6 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || uploadingLogo}>
              {form.formState.isSubmitting ? (
                <Spinner className="text-current" />
              ) : isEdit ? (
                <PencilIcon data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {isEdit ? "Salvar alterações" : "Criar planejamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
