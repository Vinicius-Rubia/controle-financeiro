import type { Account, AccountKind } from "@/types/account"
import type { Category, CategoryType } from "@/types/category"
import {
  isValidWalletAccentHex,
  normalizeWalletAccentHex,
} from "@/lib/card-wallet-accent"
import type { Card } from "@/types/card"
import type {
  CreateInstallmentPlanInput,
  Installment,
  InstallmentPaymentMethod,
  InstallmentPlan,
} from "@/types/installment"
import type {
  CreateRecurringRuleInput,
  RecurringFrequency,
  RecurringRule,
} from "@/types/recurring"
import type { PaymentMethod, Transaction, TransactionType } from "@/types/transaction"

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

/** Backup JSON ou cópias podem trazer dia como string. */
function coerceDayOfMonth(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.trunc(v)
    if (n >= 1 && n <= 31) return n
    return null
  }
  if (typeof v === "string" && v.trim()) {
    const n = Math.trunc(Number(v.trim()))
    if (Number.isFinite(n) && n >= 1 && n <= 31) return n
  }
  return null
}

function coerceNonNegativeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim().replace(",", "."))
    if (Number.isFinite(n) && n >= 0) return n
  }
  return null
}

function coerceCardActive(v: unknown): boolean | null {
  if (v === true || v === "true" || v === 1 || v === "1") return true
  if (v === false || v === "false" || v === 0 || v === "0") return false
  return null
}

function optionalTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

function parseCategoryType(
  raw: Record<string, unknown>
): CategoryType | null {
  if (raw.type === "income" || raw.type === "expense" || raw.type === "both") {
    return raw.type
  }
  if (raw.kind === "income" || raw.kind === "expense") {
    return raw.kind
  }
  return null
}

/** Converte item desconhecido (v2 ou legado v1) em categoria válida ou descarta. */
export function parseCategory(raw: unknown): Category | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (!isNonEmptyString(o.id)) return null
  if (!isNonEmptyString(o.name)) return null

  const type = parseCategoryType(o)
  if (!type) return null

  const createdAt = isNonEmptyString(o.createdAt) ? o.createdAt.trim() : null
  if (!createdAt) return null

  let updatedAt = isNonEmptyString(o.updatedAt) ? o.updatedAt.trim() : null
  if (!updatedAt) updatedAt = createdAt

  return {
    id: o.id.trim(),
    name: o.name.trim(),
    type,
    createdAt,
    updatedAt,
  }
}

export function parseCard(raw: unknown): Card | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (!isNonEmptyString(o.id)) return null
  if (!isNonEmptyString(o.name)) return null
  if (!isNonEmptyString(o.accountId)) return null

  const active = coerceCardActive(o.active)
  if (active === null) return null

  const closingDay = coerceDayOfMonth(o.closingDay)
  const dueDay = coerceDayOfMonth(o.dueDay)
  if (closingDay === null || dueDay === null) return null

  const limit = coerceNonNegativeNumber(o.limit)
  if (limit === null) return null

  const createdAt = isNonEmptyString(o.createdAt) ? o.createdAt.trim() : null
  if (!createdAt) return null

  let updatedAt = isNonEmptyString(o.updatedAt) ? o.updatedAt.trim() : null
  if (!updatedAt) updatedAt = createdAt

  const logoDataUrl = typeof o.logoDataUrl === "string" ? o.logoDataUrl : ""

  const walletRaw =
    typeof o.walletAccentHex === "string" ? o.walletAccentHex.trim() : ""
  const walletAccentHex = normalizeWalletAccentHex(
    walletRaw.startsWith("#") ? walletRaw : walletRaw ? `#${walletRaw}` : ""
  )

  return {
    id: o.id.trim(),
    name: o.name.trim(),
    logoDataUrl,
    accountId: o.accountId.trim(),
    active,
    closingDay,
    dueDay,
    limit,
    walletAccentHex,
    createdAt,
    updatedAt,
  }
}

function parseAccountKind(raw: Record<string, unknown>): AccountKind | null {
  const k = raw.kind
  if (
    k === "checking" ||
    k === "savings" ||
    k === "cash" ||
    k === "investment" ||
    k === "other"
  ) {
    return k
  }
  return null
}

export function parseAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (!isNonEmptyString(o.id)) return null
  if (!isNonEmptyString(o.name)) return null
  const kind = parseAccountKind(o)
  if (!kind) return null
  if (typeof o.active !== "boolean") return null

  const createdAt = isNonEmptyString(o.createdAt) ? o.createdAt.trim() : null
  if (!createdAt) return null

  let updatedAt = isNonEmptyString(o.updatedAt) ? o.updatedAt.trim() : null
  if (!updatedAt) updatedAt = createdAt

  const logoDataUrl = typeof o.logoDataUrl === "string" ? o.logoDataUrl : ""

  const walletRaw =
    typeof o.walletAccentHex === "string" ? o.walletAccentHex.trim() : ""
  const walletAccentHex = normalizeWalletAccentHex(
    walletRaw.startsWith("#") ? walletRaw : walletRaw ? `#${walletRaw}` : ""
  )

  return {
    id: o.id.trim(),
    name: o.name.trim(),
    kind,
    active: o.active,
    logoDataUrl,
    walletAccentHex,
    createdAt,
    updatedAt,
  }
}

function parseTransactionType(
  raw: Record<string, unknown>
): TransactionType | null {
  if (raw.type === "income" || raw.type === "expense") return raw.type
  if (raw.kind === "income" || raw.kind === "expense") return raw.kind
  return null
}

function parsePaymentMethod(raw: Record<string, unknown>): PaymentMethod | null {
  const v = raw.paymentMethod
  if (
    v === "pix" ||
    v === "debit_card" ||
    v === "credit_card" ||
    v === "boleto" ||
    v === "cash" ||
    v === "credit_card_settlement" ||
    v === "account_transfer"
  ) {
    return v
  }
  return null
}

function parseInstallmentPaymentMethod(
  raw: Record<string, unknown>
): InstallmentPaymentMethod | null {
  const pm = parsePaymentMethod(raw)
  if (!pm || pm === "credit_card_settlement" || pm === "account_transfer") {
    return null
  }
  return pm
}

function resolveTitle(o: Record<string, unknown>): string | null {
  if (isNonEmptyString(o.title)) return o.title.trim()
  if (isNonEmptyString(o.description)) return o.description.trim()
  return null
}

/** Converte item desconhecido (v2 ou legado v1) em transação válida ou descarta. */
export function parseTransaction(raw: unknown): Transaction | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (!isNonEmptyString(o.id)) return null
  if (!isFiniteNumber(o.amount) || o.amount <= 0) return null

  const type = parseTransactionType(o)
  if (!type) return null

  if (!isNonEmptyString(o.date)) return null

  const title = resolveTitle(o)
  if (!title) return null

  const description =
    typeof o.description === "string" ? o.description : ""

  const createdAt = isNonEmptyString(o.createdAt) ? o.createdAt.trim() : null
  if (!createdAt) return null

  let updatedAt = isNonEmptyString(o.updatedAt) ? o.updatedAt.trim() : null
  if (!updatedAt) updatedAt = createdAt

  const paymentMethod = parsePaymentMethod(o)
  if (!paymentMethod) return null
  const categoryId = optionalTrimmedString(o.categoryId)
  if (
    paymentMethod !== "credit_card_settlement" &&
    paymentMethod !== "account_transfer" &&
    !categoryId
  ) {
    return null
  }
  const accountId = optionalTrimmedString(o.accountId)
  if (!accountId) return null
  const cardId = optionalTrimmedString(o.cardId)
  const statementPeriodKey = optionalTrimmedString(o.statementPeriodKey)
  const transferGroupId = optionalTrimmedString(o.transferGroupId)

  return {
    id: o.id.trim(),
    title,
    amount: o.amount,
    type,
    categoryId,
    paymentMethod,
    accountId,
    cardId,
    statementPeriodKey,
    transferGroupId,
    date: o.date.trim(),
    description,
    createdAt,
    updatedAt,
  }
}

function parseRecurringFrequency(
  raw: Record<string, unknown>
): RecurringFrequency | null {
  const v = raw.frequency
  if (v === "monthly" || v === "weekly") return v
  return null
}

/** Converte item desconhecido em regra de recorrência válida ou descarta. */
export function parseRecurringRule(raw: unknown): RecurringRule | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (!isNonEmptyString(o.id)) return null
  if (!isFiniteNumber(o.amount) || o.amount <= 0) return null

  const type = parseTransactionType(o)
  if (!type) return null
  if (!isNonEmptyString(o.categoryId)) return null

  const title = resolveTitle(o)
  if (!title) return null

  const description =
    typeof o.description === "string" ? o.description : ""

  const paymentMethod = parsePaymentMethod(o)
  if (!paymentMethod) return null
  if (paymentMethod === "credit_card_settlement") return null
  const accountId = optionalTrimmedString(o.accountId)
  if (!accountId) return null
  const cardId = optionalTrimmedString(o.cardId)

  const frequency = parseRecurringFrequency(o)
  if (!frequency) return null

  let dayOfMonth: number | undefined
  let weekday: number | undefined
  if (frequency === "monthly") {
    if (
      !isFiniteNumber(o.dayOfMonth) ||
      o.dayOfMonth < 1 ||
      o.dayOfMonth > 31
    ) {
      return null
    }
    dayOfMonth = o.dayOfMonth
  } else {
    if (!isFiniteNumber(o.weekday) || o.weekday < 0 || o.weekday > 6) {
      return null
    }
    weekday = o.weekday
  }

  if (typeof o.active !== "boolean") return null

  const createdAt = isNonEmptyString(o.createdAt) ? o.createdAt.trim() : null
  if (!createdAt) return null

  let updatedAt = isNonEmptyString(o.updatedAt) ? o.updatedAt.trim() : null
  if (!updatedAt) updatedAt = createdAt

  const lastPostedAtRaw = o.lastPostedAt
  const lastPostedAt =
    typeof lastPostedAtRaw === "string" && lastPostedAtRaw.trim().length > 0
      ? lastPostedAtRaw.trim()
      : undefined

  const autoPost = typeof o.autoPost === "boolean" ? o.autoPost : false
  const lastAutoPostedMonthKey = optionalTrimmedString(o.lastAutoPostedMonthKey)

  const logoDataUrl = typeof o.logoDataUrl === "string" ? o.logoDataUrl : ""

  return {
    id: o.id.trim(),
    title,
    logoDataUrl,
    amount: o.amount,
    type,
    categoryId: o.categoryId.trim(),
    paymentMethod,
    accountId,
    cardId,
    description,
    frequency,
    dayOfMonth,
    weekday,
    active: o.active,
    autoPost,
    lastAutoPostedMonthKey,
    lastPostedAt,
    createdAt,
    updatedAt,
  }
}

function parseInstallment(raw: unknown): Installment | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (!isNonEmptyString(o.id)) return null
  if (!isFiniteNumber(o.number) || o.number < 1) return null
  if (!isFiniteNumber(o.amount) || o.amount <= 0) return null
  if (!isNonEmptyString(o.dueDate)) return null
  // Retrocompatibilidade:
  // - pending -> reserved
  // - paid -> posted
  let status: Installment["status"] | null = null
  if (o.status === "reserved" || o.status === "posted" || o.status === "cancelled") {
    status = o.status
  }
  if (o.status === "pending") status = "reserved"
  if (o.status === "paid") status = "posted"
  if (!status) return null

  const postedAt = optionalTrimmedString(o.postedAt) ?? optionalTrimmedString(o.paidAt)
  const settledAmountRaw = o.settledAmount ?? o.paidAmount
  const settledAmount =
    isFiniteNumber(settledAmountRaw) && settledAmountRaw > 0 ? settledAmountRaw : undefined
  const paymentTransactionId = optionalTrimmedString(o.paymentTransactionId)

  if (status === "posted" && !paymentTransactionId) return null

  return {
    id: o.id.trim(),
    number: o.number,
    amount: o.amount,
    dueDate: o.dueDate.trim(),
    status,
    postedAt,
    settledAmount,
    paymentTransactionId,
  }
}

export function parseInstallmentPlan(raw: unknown): InstallmentPlan | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (!isNonEmptyString(o.id)) return null
  if (!isNonEmptyString(o.title)) return null
  if (!isFiniteNumber(o.totalAmount) || o.totalAmount <= 0) return null
  if (!isFiniteNumber(o.installmentCount) || o.installmentCount < 1) return null
  const type = parseTransactionType(o)
  if (!type) return null
  if (!isNonEmptyString(o.categoryId)) return null
  const paymentMethod = parseInstallmentPaymentMethod(o)
  if (!paymentMethod) return null
  const accountId = optionalTrimmedString(o.accountId)
  if (!accountId) return null
  const cardId = optionalTrimmedString(o.cardId)
  const description = typeof o.description === "string" ? o.description : ""
  const logoDataUrl = typeof o.logoDataUrl === "string" ? o.logoDataUrl : ""
  const walletAccentHex = normalizeWalletAccentHex(
    typeof o.walletAccentHex === "string" ? o.walletAccentHex : ""
  )
  if (o.status !== "active" && o.status !== "completed" && o.status !== "cancelled") {
    return null
  }
  if (!Array.isArray(o.installments) || o.installments.length < 1) return null
  const installments = o.installments
    .map((item) => parseInstallment(item))
    .filter((item): item is Installment => item !== null)
  if (installments.length !== o.installments.length) return null

  const createdAt = isNonEmptyString(o.createdAt) ? o.createdAt.trim() : null
  if (!createdAt) return null
  let updatedAt = isNonEmptyString(o.updatedAt) ? o.updatedAt.trim() : null
  if (!updatedAt) updatedAt = createdAt

  const reservedAmountRaw = o.reservedAmount
  const postedAmountRaw = o.postedAmount
  const reservedAmount =
    isFiniteNumber(reservedAmountRaw) && reservedAmountRaw >= 0
      ? reservedAmountRaw
      : installments
          .filter((i) => i.status === "reserved")
          .reduce((sum, i) => sum + i.amount, 0)
  const postedAmount =
    isFiniteNumber(postedAmountRaw) && postedAmountRaw >= 0
      ? postedAmountRaw
      : installments
          .filter((i) => i.status === "posted")
          .reduce((sum, i) => sum + i.amount, 0)

  const autoPost = typeof o.autoPost === "boolean" ? o.autoPost : false

  return {
    id: o.id.trim(),
    title: o.title.trim(),
    logoDataUrl,
    walletAccentHex,
    totalAmount: o.totalAmount,
    installmentCount: o.installmentCount,
    type,
    categoryId: o.categoryId.trim(),
    paymentMethod,
    accountId,
    cardId,
    description,
    autoPost,
    status: o.status,
    reservedAmount,
    postedAmount,
    installments,
    createdAt,
    updatedAt,
  }
}

/** Valida entrada antes de persistir (create/update). */
export function assertCreateCategoryInput(
  input: unknown
): input is Pick<Category, "name" | "type"> {
  if (!input || typeof input !== "object") return false
  const o = input as Record<string, unknown>
  if (!isNonEmptyString(o.name)) return false
  return (
    o.type === "income" || o.type === "expense" || o.type === "both"
  )
}

export function assertCreateCardInput(
  input: unknown
): input is Omit<Card, "id" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object") return false
  const o = input as Record<string, unknown>
  if (!isNonEmptyString(o.name)) return false
  if (!isNonEmptyString(o.accountId)) return false
  if (typeof o.active !== "boolean") return false
  if (!isFiniteNumber(o.closingDay) || o.closingDay < 1 || o.closingDay > 31) {
    return false
  }
  if (!isFiniteNumber(o.dueDay) || o.dueDay < 1 || o.dueDay > 31) return false
  if (!isFiniteNumber(o.limit) || o.limit < 0) return false
  if (typeof o.logoDataUrl !== "string") return false
  if (typeof o.walletAccentHex !== "string") return false
  if (!isValidWalletAccentHex(o.walletAccentHex)) return false
  return true
}

export function assertCreateTransactionInput(
  input: unknown
): input is Omit<Transaction, "id" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object") return false
  const o = input as Record<string, unknown>
  if (!isNonEmptyString(o.title)) return false
  if (!isFiniteNumber(o.amount) || o.amount <= 0) return false
  if (o.type !== "income" && o.type !== "expense") return false
  if (
    o.paymentMethod !== "pix" &&
    o.paymentMethod !== "debit_card" &&
    o.paymentMethod !== "credit_card" &&
    o.paymentMethod !== "boleto" &&
    o.paymentMethod !== "cash" &&
    o.paymentMethod !== "credit_card_settlement" &&
    o.paymentMethod !== "account_transfer"
  ) {
    return false
  }
  if (
    o.paymentMethod !== "credit_card_settlement" &&
    o.paymentMethod !== "account_transfer" &&
    !isNonEmptyString(o.categoryId)
  ) {
    return false
  }
  if (!isNonEmptyString(o.date)) return false
  if (typeof o.description !== "string") return false
  if (!isNonEmptyString(o.accountId)) return false
  if (o.cardId !== undefined && !isNonEmptyString(o.cardId)) return false
  if (o.paymentMethod === "credit_card_settlement") {
    if (!isNonEmptyString(o.statementPeriodKey)) return false
  } else if (
    o.statementPeriodKey !== undefined &&
    !isNonEmptyString(o.statementPeriodKey)
  ) {
    return false
  }
  if (
    o.transferGroupId !== undefined &&
    !isNonEmptyString(o.transferGroupId)
  ) {
    return false
  }
  return true
}

export function assertCreateAccountInput(
  input: unknown
): input is Omit<Account, "id" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object") return false
  const o = input as Record<string, unknown>
  if (!isNonEmptyString(o.name)) return false
  const k = o.kind
  if (
    k !== "checking" &&
    k !== "savings" &&
    k !== "cash" &&
    k !== "investment" &&
    k !== "other"
  ) {
    return false
  }
  if (typeof o.active !== "boolean") return false
  if (typeof o.logoDataUrl !== "string") return false
  if (typeof o.walletAccentHex !== "string") return false
  if (!isValidWalletAccentHex(o.walletAccentHex)) return false
  return true
}

export function assertCreateRecurringRuleInput(
  input: unknown
): input is CreateRecurringRuleInput {
  if (!input || typeof input !== "object") return false
  const o = input as Record<string, unknown>
  if (!isNonEmptyString(o.title)) return false
  if (!isFiniteNumber(o.amount) || o.amount <= 0) return false
  if (o.type !== "income" && o.type !== "expense") return false
  if (
    o.paymentMethod !== "pix" &&
    o.paymentMethod !== "debit_card" &&
    o.paymentMethod !== "credit_card" &&
    o.paymentMethod !== "boleto" &&
    o.paymentMethod !== "cash"
  ) {
    return false
  }
  if (!isNonEmptyString(o.categoryId)) return false
  if (typeof o.description !== "string") return false
  if (!isNonEmptyString(o.accountId)) return false
  if (o.cardId !== undefined && !isNonEmptyString(o.cardId)) return false
  if (typeof o.active !== "boolean") return false
  if (typeof o.logoDataUrl !== "string") return false
  if (o.autoPost !== undefined && typeof o.autoPost !== "boolean") return false
  if (o.frequency !== "monthly" && o.frequency !== "weekly") return false
  if (o.frequency === "monthly") {
    if (
      !isFiniteNumber(o.dayOfMonth) ||
      o.dayOfMonth < 1 ||
      o.dayOfMonth > 31
    ) {
      return false
    }
  } else {
    if (!isFiniteNumber(o.weekday) || o.weekday < 0 || o.weekday > 6) {
      return false
    }
  }
  return true
}

export function assertCreateInstallmentPlanInput(
  input: unknown
): input is CreateInstallmentPlanInput {
  if (!input || typeof input !== "object") return false
  const o = input as Record<string, unknown>
  if (!isNonEmptyString(o.title)) return false
  if (typeof o.logoDataUrl !== "string") return false
  if (!isFiniteNumber(o.totalAmount) || o.totalAmount <= 0) return false
  if (!isFiniteNumber(o.installmentCount) || o.installmentCount < 1) return false
  if (!isNonEmptyString(o.firstDueDate)) return false
  if (o.type !== "income" && o.type !== "expense") return false
  if (!isNonEmptyString(o.categoryId)) return false
  if (
    o.paymentMethod !== "pix" &&
    o.paymentMethod !== "debit_card" &&
    o.paymentMethod !== "credit_card" &&
    o.paymentMethod !== "boleto" &&
    o.paymentMethod !== "cash"
  ) {
    return false
  }
  if (!isNonEmptyString(o.accountId)) return false
  if (o.cardId !== undefined && !isNonEmptyString(o.cardId)) return false
  if (typeof o.description !== "string") return false
  if (typeof o.walletAccentHex !== "string") return false
  if (!isValidWalletAccentHex(o.walletAccentHex)) return false
  if (o.autoPost !== undefined && typeof o.autoPost !== "boolean") return false
  return true
}
