import { format } from "date-fns"
import { CalendarIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
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
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type {
  CashScopeFilter,
  TransactionListFilters,
  TransactionTypeFilter,
} from "@/lib/filter-transactions"
import type { Account } from "@/types/account"
import type { Category } from "@/types/category"

function isoDateToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((n) => Number(n))
  return new Date(year, month - 1, day)
}

function setFilter<K extends keyof TransactionListFilters>(
  current: TransactionListFilters,
  key: K,
  value: TransactionListFilters[K]
): TransactionListFilters {
  return { ...current, [key]: value }
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  categories,
  accounts,
  disabled,
}: {
  filters: TransactionListFilters
  onFiltersChange: (next: TransactionListFilters) => void
  categories: Category[]
  accounts: Account[]
  disabled?: boolean
}) {
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  )

  const sortedAccounts = [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  )

  const [periodOpen, setPeriodOpen] = useState(false)

  const selectedRange = useMemo((): DateRange | undefined => {
    const hasFrom = Boolean(filters.dateFrom)
    const hasTo = Boolean(filters.dateTo)

    if (!hasFrom && !hasTo) return undefined

    return {
      from: hasFrom ? isoDateToLocalDate(filters.dateFrom) : undefined,
      to: hasTo ? isoDateToLocalDate(filters.dateTo) : undefined,
    }
  }, [filters.dateFrom, filters.dateTo])

  return (
    <Card className={disabled ? "opacity-60" : undefined}>
      <CardHeader className="space-y-1.5 border-b pb-4">
        <CardTitle className="text-lg">Filtros</CardTitle>
        <CardDescription>
          Refine por tipo, categoria, conta, visão de caixa, intervalo de datas ou
          busca no título e na descrição.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <FieldGroup className="gap-4">
          <Field data-disabled={disabled ? true : undefined}>
            <FieldLabel>Tipo</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              className="w-full justify-stretch *:flex-1"
              value={filters.type}
              disabled={disabled}
              onValueChange={(v) => {
                if (v)
                  onFiltersChange(
                    setFilter(filters, "type", v as TransactionTypeFilter)
                  )
              }}
            >
              <ToggleGroupItem value="all">Todos</ToggleGroupItem>
              <ToggleGroupItem value="income">Entradas</ToggleGroupItem>
              <ToggleGroupItem value="expense">Saídas</ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field data-disabled={disabled ? true : undefined}>
              <FieldLabel>Visão</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                className="w-full justify-stretch *:flex-1"
                value={filters.cashScope}
                disabled={disabled}
                onValueChange={(v) => {
                  if (v)
                    onFiltersChange(
                      setFilter(filters, "cashScope", v as CashScopeFilter)
                    )
                }}
              >
                <ToggleGroupItem value="all">Todos</ToggleGroupItem>
                <ToggleGroupItem value="cash_only">Só caixa</ToggleGroupItem>
              </ToggleGroup>
              <div className="text-muted-foreground text-xs">
                Só caixa: movimentação imediata na conta (Pix, débito, dinheiro,
                boleto e pagamento de fatura — sem compra no crédito).
              </div>
            </Field>

            <Field data-disabled={disabled ? true : undefined}>
              <FieldLabel htmlFor="filter-category">Categoria</FieldLabel>
              <Select
                value={filters.categoryId}
                disabled={disabled}
                onValueChange={(categoryId) =>
                  onFiltersChange(setFilter(filters, "categoryId", categoryId))
                }
              >
                <SelectTrigger
                  id="filter-category"
                  className="w-full min-w-0"
                  size="default"
                >
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {sortedCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field data-disabled={disabled ? true : undefined}>
              <FieldLabel htmlFor="filter-account">Conta</FieldLabel>
              <Select
                value={filters.accountId}
                disabled={disabled}
                onValueChange={(accountId) =>
                  onFiltersChange(setFilter(filters, "accountId", accountId))
                }
              >
                <SelectTrigger
                  id="filter-account"
                  className="w-full min-w-0"
                  size="default"
                >
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas as contas</SelectItem>
                    {sortedAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field
              data-disabled={disabled ? true : undefined}
            >
              <FieldLabel>Período</FieldLabel>
              <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className="w-full justify-start gap-2"
                    aria-disabled={disabled}
                  >
                    <CalendarIcon data-icon="inline-start" />
                    {filters.dateFrom && filters.dateTo ? (
                      <span className="truncate">
                        {isoDateToLocalDate(filters.dateFrom).toLocaleDateString(
                          "pt-BR"
                        )}{" "}
                        −{" "}
                        {isoDateToLocalDate(filters.dateTo).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                    ) : filters.dateFrom ? (
                      <span className="truncate">
                        A partir de{" "}
                        {isoDateToLocalDate(filters.dateFrom).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                    ) : filters.dateTo ? (
                      <span className="truncate">
                        Até{" "}
                        {isoDateToLocalDate(filters.dateTo).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                    ) : (
                      <span className="truncate">Selecione o período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    defaultMonth={
                      filters.dateFrom
                        ? isoDateToLocalDate(filters.dateFrom)
                        : undefined
                    }
                    onSelect={(range) => {
                      if (!range) {
                        onFiltersChange({
                          ...filters,
                          dateFrom: "",
                          dateTo: "",
                        })
                        setPeriodOpen(false)
                        return
                      }

                      // Em `mode="range"` o 1º clique pode vir com `to` igual ao
                      // mesmo dia (um "range de 1 dia") e isso não deve fechar
                      // o popover nem preencher `dateTo`.
                      const fromISO = range.from
                        ? format(range.from, "yyyy-MM-dd")
                        : ""
                      const toISO = range.to ? format(range.to, "yyyy-MM-dd") : ""

                      const wasEmptyBefore =
                        !filters.dateFrom && !filters.dateTo

                      if (wasEmptyBefore && fromISO && toISO && toISO === fromISO) {
                        onFiltersChange({
                          ...filters,
                          dateFrom: fromISO,
                          dateTo: "",
                        })
                        return
                      }

                      onFiltersChange({
                        ...filters,
                        dateFrom: fromISO,
                        dateTo: toISO,
                      })

                      if (toISO) setPeriodOpen(false)
                    }}
                    weekStartsOn={1}
                    showOutsideDays
                  />
                </PopoverContent>
              </Popover>

              <div className="text-muted-foreground text-xs">
                {filters.dateFrom && filters.dateTo ? (
                  <span>
                    Filtrando de{" "}
                    {isoDateToLocalDate(filters.dateFrom).toLocaleDateString(
                      "pt-BR"
                    )}{" "}
                    até{" "}
                    {isoDateToLocalDate(filters.dateTo).toLocaleDateString("pt-BR")}
                  </span>
                ) : filters.dateFrom ? (
                  <span>
                    Filtrando a partir de{" "}
                    {isoDateToLocalDate(filters.dateFrom).toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                ) : filters.dateTo && (
                  <span>
                    Filtrando até{" "}
                    {isoDateToLocalDate(filters.dateTo).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </Field>

            <Field
              data-disabled={disabled ? true : undefined}
              className="sm:col-span-2"
            >
              <FieldLabel htmlFor="filter-search">Buscar</FieldLabel>
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground size-4"
                  aria-hidden
                />
                <Input
                  id="filter-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Título ou descrição"
                  disabled={disabled}
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) =>
                    onFiltersChange(
                      setFilter(filters, "search", e.target.value)
                    )
                  }
                />
              </div>
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
