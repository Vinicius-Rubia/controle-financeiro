import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, PencilIcon, PlusIcon } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import { isoDateToLocalDate } from "@/lib/transaction-ui"
import type {
  CreateSavingsGoalInput,
  SavingsGoal,
  UpdateSavingsGoalInput,
} from "@/types/savings-goal"

const formSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Informe o nome da meta.")
      .max(120, "No máximo 120 caracteres."),
    monthlyTarget: z.string(),
    totalTarget: z.string(),
    deadline: z.string(),
  })
  .superRefine((values, ctx) => {
    const monthly = parseCurrencyInputBR(values.monthlyTarget)
    if (monthly === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monthlyTarget"],
        message: "Informe quanto quer guardar por mês.",
      })
    }
    const totalTrim = values.totalTarget.trim()
    if (totalTrim.length > 0) {
      const total = parseCurrencyInputBR(values.totalTarget)
      if (total === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalTarget"],
          message: "Valor total inválido.",
        })
      }
    }
  })

type FormValues = z.infer<typeof formSchema>

function defaultValues(goal: SavingsGoal | null): FormValues {
  if (!goal) {
    return {
      title: "",
      monthlyTarget: "",
      totalTarget: "",
      deadline: "",
    }
  }
  return {
    title: goal.title,
    monthlyTarget: formatCurrencyInputBRFromNumber(goal.monthlyTargetAmount),
    totalTarget:
      goal.targetTotalAmount !== null
        ? formatCurrencyInputBRFromNumber(goal.targetTotalAmount)
        : "",
    deadline: goal.targetDeadlineDate ?? "",
  }
}

export function SavingsGoalFormDialog({
  open,
  onOpenChange,
  goalToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalToEdit: SavingsGoal | null
  onCreate: (input: CreateSavingsGoalInput) => void
  onUpdate: (input: UpdateSavingsGoalInput) => SavingsGoal | null
}) {
  const isEdit = goalToEdit !== null
  const [deadlineOpen, setDeadlineOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(goalToEdit),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(goalToEdit))
    }
  }, [open, goalToEdit, form])

  const deadlineVal = useWatch({ control: form.control, name: "deadline" })

  const onSubmit = form.handleSubmit((values) => {
    const monthly = parseCurrencyInputBR(values.monthlyTarget)
    if (monthly === null) return

    const totalTrim = values.totalTarget.trim()
    const targetTotalAmount =
      totalTrim.length > 0 ? parseCurrencyInputBR(values.totalTarget) : null
    if (totalTrim.length > 0 && targetTotalAmount === null) return

    const deadlineTrim = values.deadline.trim()
    const targetDeadlineDate = deadlineTrim.length > 0 ? deadlineTrim : null

    if (isEdit && goalToEdit) {
      const next = onUpdate({
        id: goalToEdit.id,
        title: values.title.trim(),
        monthlyTargetAmount: monthly,
        targetTotalAmount,
        targetDeadlineDate,
      })
      if (next) {
        toast.success("Meta atualizada.")
        onOpenChange(false)
      } else toast.error("Não foi possível salvar.")
      return
    }

    onCreate({
      title: values.title.trim(),
      monthlyTargetAmount: monthly,
      targetTotalAmount,
      targetDeadlineDate,
    })
    toast.success("Meta criada.")
    onOpenChange(false)
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDeadlineOpen(false)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <PencilIcon className="size-4 opacity-80" />
            ) : (
              <PlusIcon className="size-4 opacity-80" />
            )}
            {isEdit ? "Editar meta" : "Nova meta (cofrinho)"}
          </DialogTitle>
          <DialogDescription>
            Defina o objetivo e o ritmo mensal. Cada aporte escolhe a conta de
            origem e gera uma despesa no extrato (categoria &quot;Meta / cofrinho&quot;).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup>
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="savings-goal-title">Nome da meta</FieldLabel>
                  <Input
                    id="savings-goal-title"
                    placeholder="Ex.: Viagem, emergência, notebook…"
                    autoComplete="off"
                    {...field}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="monthlyTarget"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="savings-goal-monthly">
                    Meta de poupança por mês
                  </FieldLabel>
                  <Input
                    id="savings-goal-monthly"
                    inputMode="numeric"
                    placeholder="0,00"
                    autoComplete="off"
                    value={field.value}
                    onChange={(e) => field.onChange(maskCurrencyInputBR(e.target.value))}
                  />
                  <FieldDescription>
                    Usamos isso para comparar com o que você já guardou neste mês.
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="totalTarget"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="savings-goal-total">
                    Valor total (opcional)
                  </FieldLabel>
                  <Input
                    id="savings-goal-total"
                    inputMode="numeric"
                    placeholder="Ex.: custo total da viagem — deixe vazio se não quiser"
                    autoComplete="off"
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(maskCurrencyInputBR(e.target.value))
                    }
                  />
                  <FieldDescription>
                    Se preencher, mostramos o quanto falta para bater a meta.
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Field>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <FieldLabel>Prazo (opcional)</FieldLabel>
                  <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2"
                      >
                        <CalendarIcon className="size-4 shrink-0 opacity-70" />
                        <span className="truncate">
                          {deadlineVal
                            ? isoDateToLocalDate(deadlineVal).toLocaleDateString("pt-BR")
                            : "Sem data limite"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          deadlineVal ? isoDateToLocalDate(deadlineVal) : undefined
                        }
                        onSelect={(d) => {
                          if (!d) return
                          form.setValue("deadline", format(d, "yyyy-MM-dd"), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                          setDeadlineOpen(false)
                        }}
                        weekStartsOn={1}
                        showOutsideDays
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {deadlineVal ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() =>
                      form.setValue("deadline", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    Limpar
                  </Button>
                ) : null}
              </div>
              <FieldDescription>
                Até quando você quer juntar o valor (só lembrete visual na lista).
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Spinner className="size-4" />
              ) : isEdit ? (
                "Salvar"
              ) : (
                "Criar meta"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
