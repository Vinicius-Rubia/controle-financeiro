import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react"
import { useEffect, useState } from "react"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { accountKindLabel } from "@/lib/account-ui"
import type {
  Account,
  AccountKind,
  CreateAccountInput,
  UpdateAccountInput,
} from "@/types/account"

const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(100, "No máximo 100 caracteres."),
  kind: z.enum([
    "checking",
    "savings",
    "cash",
    "investment",
    "other",
  ]),
  active: z.boolean(),
  logoDataUrl: z.string(),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

function defaultValues(account: Account | null): AccountFormValues {
  if (!account) {
    return {
      name: "",
      kind: "checking",
      active: true,
      logoDataUrl: "",
    }
  }
  return {
    name: account.name,
    kind: account.kind,
    active: account.active,
    logoDataUrl: account.logoDataUrl,
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."))
    reader.readAsDataURL(file)
  })
}

export function AccountFormDialog({
  open,
  onOpenChange,
  accounts,
  accountToEdit,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  accountToEdit: Account | null
  onCreate: (input: CreateAccountInput) => void
  onUpdate: (input: UpdateAccountInput) => Account | null
}) {
  const isEdit = accountToEdit !== null
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: defaultValues(accountToEdit),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(accountToEdit))
    }
  }, [open, accountToEdit, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const nameLower = values.name.trim().toLowerCase()
    const duplicated = accounts.some(
      (a) =>
        a.id !== accountToEdit?.id &&
        a.name.trim().toLowerCase() === nameLower
    )
    if (duplicated) {
      form.setError("name", { message: "Já existe uma conta com este nome." })
      return
    }

    const payload = {
      name: values.name.trim(),
      kind: values.kind,
      active: values.active,
      logoDataUrl: values.logoDataUrl,
    }

    try {
      if (accountToEdit) {
        const next = onUpdate({
          id: accountToEdit.id,
          ...payload,
        })
        if (next === null) {
          toast.error("Não foi possível atualizar a conta.")
          return
        }
        toast.success("Conta atualizada.")
      } else {
        onCreate(payload)
        toast.success("Conta criada.")
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível salvar a conta."
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar conta" : "Nova conta"}
          </DialogTitle>
          <DialogDescription>
            Contas representam onde o dinheiro entra ou sai (ex.: conta corrente
            para Pix e transferências, ou dinheiro em espécie).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={form.formState.errors.name ? true : undefined}>
              <FieldLabel htmlFor="acc-name">Nome</FieldLabel>
              <Input
                id="acc-name"
                autoComplete="off"
                placeholder="Ex.: Conta corrente Nubank"
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={form.formState.errors.kind ? true : undefined}>
              <FieldLabel htmlFor="acc-kind">Tipo</FieldLabel>
              <Controller
                name="kind"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="acc-kind"
                      className="w-full min-w-0"
                      aria-invalid={!!form.formState.errors.kind}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          "checking",
                          "savings",
                          "cash",
                          "investment",
                          "other",
                        ] as AccountKind[]
                      ).map((k) => (
                        <SelectItem key={k} value={k}>
                          {accountKindLabel(k)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.kind]} />
            </Field>

            <Field
              data-invalid={form.formState.errors.active ? true : undefined}
            >
              <FieldLabel>Estado</FieldLabel>
              <Controller
                name="active"
                control={form.control}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    className="w-full justify-stretch *:flex-1"
                    value={field.value ? "on" : "off"}
                    onValueChange={(v) => {
                      if (v === "on") field.onChange(true)
                      if (v === "off") field.onChange(false)
                    }}
                  >
                    <ToggleGroupItem value="on">Ativa</ToggleGroupItem>
                    <ToggleGroupItem value="off">Inativa</ToggleGroupItem>
                  </ToggleGroup>
                )}
              />
              <FieldDescription className="text-xs">
                Contas inativas não aparecem em novos lançamentos.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.active]} />
            </Field>

            <Field>
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
                A logo aparece na lista de contas e nos cartões que usam esta conta
                para pagar a fatura.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
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
