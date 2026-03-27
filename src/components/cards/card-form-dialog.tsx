import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import {
  formatCurrencyInputBRFromNumber,
  maskCurrencyInputBR,
  parseCurrencyInputBR,
} from "@/lib/currency-input"
import type { Account } from "@/types/account"
import type { Card, CreateCardInput, UpdateCardInput } from "@/types/card"

const cardFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(100, "No máximo 100 caracteres."),
  logoDataUrl: z.string(),
  accountId: z.string().trim().min(1, "Selecione a conta para pagamento da fatura."),
  active: z.boolean(),
  closingDay: z.coerce.number().int().min(1, "Dia inválido.").max(31, "Dia inválido."),
  dueDay: z.coerce.number().int().min(1, "Dia inválido.").max(31, "Dia inválido."),
  limit: z
    .string()
    .trim()
    .refine((s) => {
      if (!s) return true
      const parsed = parseCurrencyInputBR(s)
      return parsed !== null
    }, "Limite inválido."),
})

type CardFormValues = z.input<typeof cardFormSchema>
type CardFormSubmitValues = z.output<typeof cardFormSchema>

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."))
    reader.readAsDataURL(file)
  })
}

function defaultValues(card: Card | null): CardFormValues {
  if (!card) {
    return {
      name: "",
      logoDataUrl: "",
      accountId: "",
      active: true,
      closingDay: 1,
      dueDay: 10,
      limit: "0,00",
    }
  }
  return {
    name: card.name,
    logoDataUrl: card.logoDataUrl,
    accountId: card.accountId,
    active: card.active,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    limit: formatCurrencyInputBRFromNumber(card.limit),
  }
}

export function CardFormDialog({
  open,
  onOpenChange,
  accounts,
  cards,
  cardToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  cards: Card[]
  cardToEdit: Card | null
  onCreate: (input: CreateCardInput) => void
  onUpdate: (input: UpdateCardInput) => Card | null
}) {
  const isEdit = cardToEdit !== null
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const form = useForm<CardFormValues, unknown, CardFormSubmitValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: defaultValues(cardToEdit),
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      form.reset(defaultValues(cardToEdit))
      setUploadingLogo(false)
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const nameLower = values.name.trim().toLowerCase()
    const duplicated = cards.some(
      (c) =>
        c.id !== cardToEdit?.id &&
        c.name.trim().toLowerCase() === nameLower
    )
    if (duplicated) {
      form.setError("name", { message: "Já existe um cartão com este nome." })
      return
    }

    const payload: CreateCardInput = {
      name: values.name.trim(),
      logoDataUrl: values.logoDataUrl,
      accountId: values.accountId.trim(),
      active: values.active,
      closingDay: values.closingDay,
      dueDay: values.dueDay,
      limit: parseCurrencyInputBR(values.limit) ?? 0,
    }

    try {
      if (cardToEdit) {
        const next = onUpdate({ id: cardToEdit.id, ...payload })
        if (!next) {
          toast.error("Não foi possível atualizar o cartão.")
          return
        }
        toast.success("Cartão atualizado.")
      } else {
        onCreate(payload)
        toast.success("Cartão criado.")
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o cartão.")
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>
            Cartão de crédito: informe ciclo de fatura, limite e a conta onde a
            fatura é paga.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={form.formState.errors.name ? true : undefined}>
              <FieldLabel htmlFor="card-name">Nome</FieldLabel>
              <Input id="card-name" autoComplete="off" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field>
              <FieldLabel>Logo do cartão (opcional)</FieldLabel>
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
                Exibida na lista ao lado do nome do cartão. A conta da fatura usa a
                logo cadastrada na própria conta.
              </FieldDescription>
            </Field>

            <Field data-invalid={form.formState.errors.accountId ? true : undefined}>
              <FieldLabel htmlFor="card-account">Conta da fatura</FieldLabel>
              <Controller
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="card-account" className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.active)
                        .map((a) => (
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <Select
                      value={field.value ? "active" : "inactive"}
                      onValueChange={(v) => field.onChange(v === "active")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field data-invalid={form.formState.errors.closingDay ? true : undefined}>
                <FieldLabel htmlFor="card-closing-day">Dia fechamento</FieldLabel>
                <Input id="card-closing-day" type="number" min={1} max={31} {...form.register("closingDay")} />
                <FieldError errors={[form.formState.errors.closingDay]} />
              </Field>
              <Field data-invalid={form.formState.errors.dueDay ? true : undefined}>
                <FieldLabel htmlFor="card-due-day">Dia vencimento</FieldLabel>
                <Input id="card-due-day" type="number" min={1} max={31} {...form.register("dueDay")} />
                <FieldError errors={[form.formState.errors.dueDay]} />
              </Field>
              <Field data-invalid={form.formState.errors.limit ? true : undefined}>
                <FieldLabel htmlFor="card-limit">Limite de crédito</FieldLabel>
                <Controller
                  control={form.control}
                  name="limit"
                  render={({ field }) => (
                    <Input
                      id="card-limit"
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
                    />
                  )}
                />
                <FieldError errors={[form.formState.errors.limit]} />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
