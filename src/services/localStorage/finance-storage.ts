import { accountNetBalanceThroughDate } from "@/lib/account-ui"
import { cardSupportsPaymentMethod } from "@/lib/card-ui"
import { cycleOutstanding, totalCreditOutstanding } from "@/lib/credit-statement"
import { todayISODate } from "@/lib/transaction-ui"
import { categoryAcceptsTransactionType } from "@/services/category-service"
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from "@/types/account"
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types/category"
import type {
  CreateInstallmentPlanInput,
  Installment,
  InstallmentPlan,
  UpdateInstallmentPlanInput,
} from "@/types/installment"
import { normalizeWalletAccentHex } from "@/lib/card-wallet-accent"
import type { Card, CreateCardInput, UpdateCardInput } from "@/types/card"
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  UpdateRecurringRuleInput,
} from "@/types/recurring"
import type {
  CreateAccountTransferInput,
  CreateTransactionInput,
  PaymentMethod,
  Transaction,
  UpdateTransactionInput,
} from "@/types/transaction"

import {
  assertCreateAccountInput,
  assertCreateCardInput,
  assertCreateCategoryInput,
  assertCreateInstallmentPlanInput,
  assertCreateRecurringRuleInput,
  assertCreateTransactionInput,
  parseAccount,
  parseCard,
  parseCategory,
  parseInstallmentPlan,
  parseRecurringRule,
  parseTransaction,
} from "./entity-parsers"
import {
  createLocalStorageRepository,
  parseStoredCollection,
} from "./generic-repository"
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "./keys"

const CREDIT_ONLY_MODEL_MIGRATION_KEY =
  "controle-financeiro.migration.credit-only-model.v1"

function readMigrationRawArray(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeMigrationRawArray(key: string, items: unknown[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

function legacyCardMode(
  o: Record<string, unknown>
): "credit" | "debit" | "mixed" | null {
  const m = o.functionMode
  if (m === "credit_only") return "credit"
  if (m === "debit_only") return "debit"
  if (m === "debit_and_credit") return "mixed"
  const t = o.type
  if (t === "credit_card") return "credit"
  if (t === "debit_card") return "debit"
  return null
}

/**
 * Migração única: remove cartão de débito, cartões só dívidas de crédito,
 * transações com `debit_card` passam a usar conta sem `cardId`.
 */
function migrateCreditOnlyFinanceModelOnce(): void {
  try {
    if (localStorage.getItem(CREDIT_ONLY_MODEL_MIGRATION_KEY)) return
  } catch {
    return
  }

  const firstAccountIdFromStorage = (): string => {
    for (const raw of readMigrationRawArray(STORAGE_KEYS.accounts)) {
      if (raw && typeof raw === "object" && "id" in raw) {
        const id = (raw as { id: unknown }).id
        if (typeof id === "string" && id.trim()) return id.trim()
      }
    }
    return ""
  }
  const fallbackAccountId = firstAccountIdFromStorage()

  const rawCards = readMigrationRawArray(STORAGE_KEYS.cards)
  const cardMeta = new Map<string, { accountId?: string }>()
  const deletedDebitCardIds = new Set<string>()

  for (const raw of rawCards) {
    if (!raw || typeof raw !== "object") continue
    const o = raw as Record<string, unknown>
    const id = typeof o.id === "string" ? o.id.trim() : ""
    if (!id) continue
    const mode = legacyCardMode(o) ?? "credit"
    const acc =
      typeof o.accountId === "string" && o.accountId.trim()
        ? o.accountId.trim()
        : undefined
    cardMeta.set(id, { accountId: acc })
    if (mode === "debit") deletedDebitCardIds.add(id)
  }

  const migratedCards: unknown[] = []
  for (const raw of rawCards) {
    if (!raw || typeof raw !== "object") continue
    const o = raw as Record<string, unknown>
    const id = typeof o.id === "string" ? o.id.trim() : ""
    if (!id) continue
    const mode = legacyCardMode(o) ?? "credit"
    if (mode === "debit") continue

    const next: Record<string, unknown> = { ...o }
    delete next.functionMode
    delete next.type

    let accountId =
      typeof next.accountId === "string" && next.accountId.trim()
        ? String(next.accountId).trim()
        : ""
    if (!accountId && fallbackAccountId) accountId = fallbackAccountId
    if (!accountId) continue

    next.accountId = accountId
    migratedCards.push(next)
  }

  function migrateTransactionLike(
    obj: Record<string, unknown>
  ): Record<string, unknown> {
    const next: Record<string, unknown> = { ...obj }
    let pm = next.paymentMethod
    let cardId =
      typeof next.cardId === "string" && next.cardId.trim()
        ? next.cardId.trim()
        : undefined
    let accountId =
      typeof next.accountId === "string" && next.accountId.trim()
        ? next.accountId.trim()
        : undefined

    if (pm === "debit_card") {
      next.paymentMethod = "debit_card"
      pm = "debit_card"
      if (!accountId && cardId) {
        accountId = cardMeta.get(cardId)?.accountId
      }
      cardId = undefined
    }

    if (cardId && deletedDebitCardIds.has(cardId)) {
      if (pm === "credit_card") {
        next.paymentMethod = "pix"
        pm = "pix"
      }
      if (!accountId) {
        accountId = cardMeta.get(cardId)?.accountId
      }
      cardId = undefined
    }

    if (pm === "credit_card" && !accountId && cardId) {
      accountId = cardMeta.get(cardId)?.accountId
    }
    if (pm === "credit_card_settlement" && !accountId && cardId) {
      accountId = cardMeta.get(cardId)?.accountId
    }

    if (!accountId && fallbackAccountId) {
      accountId = fallbackAccountId
    }

    next.cardId = cardId
    next.accountId = accountId
    return next
  }

  const rawTx = readMigrationRawArray(STORAGE_KEYS.transactions)
  const migratedTx = rawTx.map((x) =>
    x && typeof x === "object"
      ? migrateTransactionLike(x as Record<string, unknown>)
      : x
  )

  const rawRec = readMigrationRawArray(STORAGE_KEYS.recurring)
  const migratedRec = rawRec.map((x) =>
    x && typeof x === "object"
      ? migrateTransactionLike(x as Record<string, unknown>)
      : x
  )

  writeMigrationRawArray(STORAGE_KEYS.cards, migratedCards)
  writeMigrationRawArray(STORAGE_KEYS.transactions, migratedTx)
  writeMigrationRawArray(STORAGE_KEYS.recurring, migratedRec)

  try {
    localStorage.setItem(
      CREDIT_ONLY_MODEL_MIGRATION_KEY,
      new Date().toISOString()
    )
  } catch {
    /* ignore */
  }
}

migrateCreditOnlyFinanceModelOnce()

const categoriesRepo = createLocalStorageRepository<Category>({
  storageKey: STORAGE_KEYS.categories,
  parseItem: parseCategory,
})

const transactionsRepo = createLocalStorageRepository<Transaction>({
  storageKey: STORAGE_KEYS.transactions,
  parseItem: parseTransaction,
})

const cardsRepo = createLocalStorageRepository<Card>({
  storageKey: STORAGE_KEYS.cards,
  parseItem: parseCard,
})

const accountsRepo = createLocalStorageRepository<Account>({
  storageKey: STORAGE_KEYS.accounts,
  parseItem: parseAccount,
})

const recurringRepo = createLocalStorageRepository<RecurringRule>({
  storageKey: STORAGE_KEYS.recurring,
  parseItem: parseRecurringRule,
})

const installmentPlansRepo = createLocalStorageRepository<InstallmentPlan>({
  storageKey: STORAGE_KEYS.installmentPlans,
  parseItem: parseInstallmentPlan,
})

let categoriesLegacyMigrated = false
let transactionsLegacyMigrated = false

function migrateCategoriesFromLegacyOnce(): void {
  if (categoriesLegacyMigrated) return
  categoriesLegacyMigrated = true
  if (categoriesRepo.list().length > 0) return
  const legacy = parseStoredCollection(
    LEGACY_STORAGE_KEYS.categories,
    parseCategory
  )
  if (legacy.length === 0) return
  categoriesRepo.replaceAll(legacy)
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEYS.categories)
  } catch {
    /* ignore */
  }
}

function migrateTransactionsFromLegacyOnce(): void {
  if (transactionsLegacyMigrated) return
  transactionsLegacyMigrated = true
  if (transactionsRepo.list().length > 0) return
  const legacy = parseStoredCollection(
    LEGACY_STORAGE_KEYS.transactions,
    parseTransaction
  )
  if (legacy.length === 0) return
  transactionsRepo.replaceAll(legacy)
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEYS.transactions)
  } catch {
    /* ignore */
  }
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function localMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function scheduledPostingDayThisMonth(now: Date, dayOfMonth: number): number {
  const y = now.getFullYear()
  const m = now.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  return Math.min(dayOfMonth, lastDay)
}

function localISODateYearMonthDay(y: number, monthIndex: number, day: number): string {
  return `${y}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

function localTodayISODate(): string {
  const n = new Date()
  return localISODateYearMonthDay(n.getFullYear(), n.getMonth(), n.getDate())
}

const ISO_RX = /^(\d{4})-(\d{2})-(\d{2})$/

function parseISODateParts(iso: string): { year: number; month: number; day: number } {
  const m = ISO_RX.exec(iso.trim())
  if (!m) throw new Error("Data inválida.")
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
  }
}

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate()
}

function addMonthsPreservingDay(baseIso: string, diffMonths: number): string {
  const base = parseISODateParts(baseIso)
  const monthIndex = base.month - 1 + diffMonths
  const nextYear = base.year + Math.floor(monthIndex / 12)
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12
  const month1 = normalizedMonthIndex + 1
  const lastDay = daysInMonth(nextYear, month1)
  const day = Math.min(base.day, lastDay)
  return `${nextYear}-${pad2(month1)}-${pad2(day)}`
}

function splitInstallmentAmounts(total: number, count: number): number[] {
  const centsTotal = Math.round(total * 100)
  const base = Math.floor(centsTotal / count)
  const remainder = centsTotal - base * count
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100)
}

function sumReservedByCardId(
  plans: InstallmentPlan[],
  cardId: string,
  ignorePlanId?: string
): number {
  let sum = 0
  for (const plan of plans) {
    if (ignorePlanId && plan.id === ignorePlanId) continue
    if (plan.paymentMethod !== "credit_card" || plan.cardId !== cardId) continue
    sum += plan.reservedAmount
  }
  return sum
}

const VALID_PAYMENT_METHODS: Set<PaymentMethod> = new Set([
  "pix",
  "debit_card",
  "credit_card",
  "boleto",
  "cash",
  "credit_card_settlement",
  "account_transfer",
])

function assertTransactionCardConsistency(tx: {
  paymentMethod: PaymentMethod
  cardId?: string
}): void {
  const needsCard =
    tx.paymentMethod === "credit_card" ||
    tx.paymentMethod === "credit_card_settlement"

  if (!needsCard) return
  if (!tx.cardId) {
    throw new Error("Selecione um cartão para este meio de pagamento.")
  }

  const card = getCardById(tx.cardId)
  if (!card) {
    throw new Error("Cartão não encontrado.")
  }
  if (!card.active) {
    throw new Error("Cartão inativo não pode ser usado em lançamentos.")
  }
  if (!cardSupportsPaymentMethod(card, tx.paymentMethod)) {
    throw new Error("Tipo do cartão incompatível com o meio de pagamento.")
  }
}

function normalizeAccountId(accountId?: string): string | undefined {
  const trimmed = accountId?.trim()
  return trimmed || undefined
}

function normalizeStatementPeriodKey(
  paymentMethod: PaymentMethod,
  key?: string
): string | undefined {
  if (paymentMethod !== "credit_card_settlement") return undefined
  return key?.trim() || undefined
}

function normalizeCategoryId(
  paymentMethod: PaymentMethod,
  categoryId?: string
): string | undefined {
  if (paymentMethod === "credit_card_settlement") return undefined
  if (paymentMethod === "account_transfer") return undefined
  const trimmed = categoryId?.trim()
  return trimmed || undefined
}

function assertSettlementTransaction(tx: {
  paymentMethod: PaymentMethod
  type: Transaction["type"]
  amount: number
  cardId?: string
  statementPeriodKey?: string
  currentTransactionId?: string
}): void {
  if (tx.paymentMethod !== "credit_card_settlement") return
  if (tx.type !== "expense") {
    throw new Error("Pagamento de fatura deve ser registrado como saída.")
  }
  if (!tx.statementPeriodKey?.trim()) {
    throw new Error("Selecione a fatura (fechamento).")
  }
  if (!tx.cardId) {
    throw new Error("Selecione o cartão de crédito.")
  }
  const card = getCardById(tx.cardId)
  if (!card) {
    throw new Error("Cartão não encontrado.")
  }
  const baseTx = transactionsRepo
    .list()
    .filter((item) => item.id !== tx.currentTransactionId)
  const outstanding = cycleOutstanding(baseTx, card, tx.statementPeriodKey)
  if (tx.amount > outstanding) {
    throw new Error("Valor do pagamento não pode exceder o saldo em aberto.")
  }
}

function assertTransactionAccountConsistency(tx: { accountId?: string }): void {
  if (!tx.accountId) {
    throw new Error("Selecione a conta.")
  }
  const acc = getAccountById(tx.accountId)
  if (!acc) {
    throw new Error("Conta não encontrada.")
  }
  if (!acc.active) {
    throw new Error("Conta inativa não pode ser usada em lançamentos.")
  }
}

// ——— Categorias ———

export function listCategories(): Category[] {
  migrateCategoriesFromLegacyOnce()
  return categoriesRepo.list()
}

export function getCategoryById(id: string): Category | undefined {
  migrateCategoriesFromLegacyOnce()
  return categoriesRepo.getById(id)
}

export function createCategory(input: CreateCategoryInput): Category {
  migrateCategoriesFromLegacyOnce()
  if (!assertCreateCategoryInput(input)) {
    throw new Error("Dados de categoria inválidos.")
  }
  const now = new Date().toISOString()
  return categoriesRepo.create(() => ({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    type: input.type,
    createdAt: now,
    updatedAt: now,
  }))
}

export function updateCategory(input: UpdateCategoryInput): Category | null {
  migrateCategoriesFromLegacyOnce()
  const { id, ...rest } = input
  const patch = omitUndefined(rest) as Partial<Omit<Category, "id">>
  return categoriesRepo.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

export function deleteCategory(id: string): boolean {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  return categoriesRepo.remove(id)
}

// ——— Cartões ———

export function listCards(): Card[] {
  return cardsRepo.list()
}

export function getCardById(id: string): Card | undefined {
  return cardsRepo.getById(id)
}

function assertCardLinkedAccount(accountId: string): void {
  const trimmed = accountId.trim()
  if (!trimmed) throw new Error("Selecione a conta vinculada ao cartão.")
  const acc = getAccountById(trimmed)
  if (!acc) throw new Error("Conta vinculada não encontrada.")
  if (!acc.active) throw new Error("Conta vinculada está inativa.")
}

export function createCard(input: CreateCardInput): Card {
  if (!assertCreateCardInput(input)) {
    throw new Error("Dados de cartão inválidos.")
  }
  assertCardLinkedAccount(input.accountId)
  const now = new Date().toISOString()
  const accountId = input.accountId.trim()
  return cardsRepo.create(() => ({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    logoDataUrl: input.logoDataUrl,
    accountId,
    active: input.active,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
    limit: input.limit,
    walletAccentHex: normalizeWalletAccentHex(input.walletAccentHex),
    createdAt: now,
    updatedAt: now,
  }))
}

export function updateCard(input: UpdateCardInput): Card | null {
  const { id, accountId: accountIdPatch, ...rest } = input
  const patch = omitUndefined(rest) as Partial<Omit<Card, "id">>
  if (accountIdPatch !== undefined) {
    const t = accountIdPatch.trim()
    if (!t) return null
    patch.accountId = t
  }

  const current = cardsRepo.getById(id)
  if (!current) return null

  const nextAccountId =
    accountIdPatch !== undefined ? patch.accountId : current.accountId

  if (typeof nextAccountId !== "string" || !nextAccountId.trim()) return null

  try {
    assertCardLinkedAccount(nextAccountId)
  } catch {
    return null
  }

  if (patch.walletAccentHex !== undefined) {
    patch.walletAccentHex = normalizeWalletAccentHex(patch.walletAccentHex)
  }

  return cardsRepo.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

export function deleteCard(id: string): boolean {
  return cardsRepo.remove(id)
}

// ——— Contas ———

export function listAccounts(): Account[] {
  return accountsRepo.list()
}

export function getAccountById(id: string): Account | undefined {
  return accountsRepo.getById(id)
}

export function createAccount(input: CreateAccountInput): Account {
  if (!assertCreateAccountInput(input)) {
    throw new Error("Dados de conta inválidos.")
  }
  const now = new Date().toISOString()
  return accountsRepo.create(() => ({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    kind: input.kind,
    active: input.active,
    logoDataUrl: input.logoDataUrl,
    walletAccentHex: normalizeWalletAccentHex(input.walletAccentHex),
    createdAt: now,
    updatedAt: now,
  }))
}

export function updateAccount(input: UpdateAccountInput): Account | null {
  const { id, ...rest } = input
  const patch = omitUndefined(rest) as Partial<Omit<Account, "id">>
  if (patch.walletAccentHex !== undefined) {
    patch.walletAccentHex = normalizeWalletAccentHex(patch.walletAccentHex)
  }
  return accountsRepo.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

export function deleteAccount(id: string): boolean {
  migrateTransactionsFromLegacyOnce()
  if (transactionsRepo.list().some((t) => t.accountId === id)) return false
  if (recurringRepo.list().some((r) => r.accountId === id)) return false
  if (cardsRepo.list().some((c) => c.accountId === id)) return false
  return accountsRepo.remove(id)
}

// ——— Transações ———

export function listTransactions(): Transaction[] {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  return transactionsRepo.list()
}

export function getTransactionById(id: string): Transaction | undefined {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  return transactionsRepo.getById(id)
}

export function createTransaction(
  input: CreateTransactionInput
): Transaction {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  if (!assertCreateTransactionInput(input)) {
    throw new Error("Dados de transação inválidos.")
  }
  const normalizedCategoryId = normalizeCategoryId(
    input.paymentMethod,
    input.categoryId
  )
  if (
    input.paymentMethod !== "credit_card_settlement" &&
    input.paymentMethod !== "account_transfer"
  ) {
    const category = getCategoryById(normalizedCategoryId as string)
    if (!category) {
      throw new Error("Categoria não encontrada.")
    }
    if (!categoryAcceptsTransactionType(category, input.type)) {
      throw new Error("Tipo de lançamento incompatível com a categoria.")
    }
  }
  if (input.paymentMethod === "account_transfer") {
    if (input.cardId?.trim()) {
      throw new Error("Transferência entre contas não utiliza cartão.")
    }
    if (input.statementPeriodKey?.trim()) {
      throw new Error("Transferências não utilizam dados de fatura.")
    }
  }
  assertTransactionCardConsistency({
    paymentMethod: input.paymentMethod,
    cardId: input.cardId,
  })
  const accountId = normalizeAccountId(input.accountId)
  assertTransactionAccountConsistency({
    accountId,
  })
  const statementPeriodKey = normalizeStatementPeriodKey(
    input.paymentMethod,
    input.statementPeriodKey
  )
  assertSettlementTransaction({
    paymentMethod: input.paymentMethod,
    type: input.type,
    amount: input.amount,
    cardId: input.cardId?.trim(),
    statementPeriodKey,
  })
  const txDateStr = input.date.trim()
  if (txDateStr > todayISODate()) {
    throw new Error("Não é possível registrar lançamento em data futura.")
  }
  const now = new Date().toISOString()
  const cardIdStored =
    input.paymentMethod === "account_transfer"
      ? undefined
      : input.cardId?.trim()
  const transferGroupId = input.transferGroupId?.trim() || undefined
  return transactionsRepo.create(() => ({
    id: crypto.randomUUID(),
    title: input.title.trim(),
    amount: input.amount,
    type: input.type,
    categoryId: normalizedCategoryId,
    paymentMethod: input.paymentMethod,
    accountId: accountId as string,
    cardId: cardIdStored,
    statementPeriodKey,
    transferGroupId,
    date: input.date.trim(),
    description: input.description,
    createdAt: now,
    updatedAt: now,
  }))
}

export function updateTransaction(
  input: UpdateTransactionInput
): Transaction | null {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  const current = transactionsRepo.getById(input.id)
  if (!current) return null
  if (current.transferGroupId) return null

  const { id, ...rest } = input
  const patch = omitUndefined(rest) as Partial<Omit<Transaction, "id">>
  const merged: Transaction = {
    ...current,
    ...patch,
    id: current.id,
  }

  if (!merged.title.trim()) return null
  if (!Number.isFinite(merged.amount) || merged.amount <= 0) return null
  if (typeof merged.description !== "string") return null
  if (!VALID_PAYMENT_METHODS.has(merged.paymentMethod)) return null

  merged.categoryId = normalizeCategoryId(merged.paymentMethod, merged.categoryId)
  if (
    merged.paymentMethod !== "credit_card_settlement" &&
    merged.paymentMethod !== "account_transfer"
  ) {
    const category = getCategoryById(merged.categoryId as string)
    if (!category) return null
    if (!categoryAcceptsTransactionType(category, merged.type)) return null
  }
  const accountId = normalizeAccountId(merged.accountId)
  if (!accountId) return null
  merged.accountId = accountId
  merged.statementPeriodKey = normalizeStatementPeriodKey(
    merged.paymentMethod,
    merged.statementPeriodKey
  )

  if (
    merged.paymentMethod === "credit_card_settlement" &&
    !merged.statementPeriodKey
  ) {
    return null
  }

  if (merged.date.trim() > todayISODate()) {
    return null
  }

  try {
    assertTransactionCardConsistency({
      paymentMethod: merged.paymentMethod,
      cardId: merged.cardId,
    })
    assertTransactionAccountConsistency({
      accountId: merged.accountId,
    })
    assertSettlementTransaction({
      paymentMethod: merged.paymentMethod,
      type: merged.type,
      amount: merged.amount,
      cardId: merged.cardId,
      statementPeriodKey: merged.statementPeriodKey,
      currentTransactionId: merged.id,
    })
  } catch {
    return null
  }

  return transactionsRepo.update(id, {
    ...patch,
    categoryId: merged.categoryId,
    accountId: merged.accountId,
    statementPeriodKey: merged.statementPeriodKey,
    updatedAt: new Date().toISOString(),
  })
}

export function deleteTransaction(id: string): boolean {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  const tx = transactionsRepo.getById(id)
  if (!tx) return false
  const group = tx.transferGroupId?.trim()
  if (group) {
    const ids = transactionsRepo
      .list()
      .filter((t) => t.transferGroupId === group)
      .map((t) => t.id)
    let ok = true
    for (const tid of ids) {
      if (!transactionsRepo.remove(tid)) ok = false
    }
    return ok
  }
  return transactionsRepo.remove(id)
}

/**
 * Registra transferência entre duas contas correntes ativas: uma saída na origem
 * e uma entrada no destino, vinculadas por `transferGroupId`.
 */
export function createAccountTransfer(
  input: CreateAccountTransferInput
): { outgoingId: string; incomingId: string } {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()

  const fromAcc = getAccountById(input.fromAccountId.trim())
  const toAcc = getAccountById(input.toAccountId.trim())
  if (!fromAcc || !toAcc) {
    throw new Error("Conta não encontrada.")
  }
  if (!fromAcc.active || !toAcc.active) {
    throw new Error("Use apenas contas ativas.")
  }
  if (fromAcc.kind !== "checking" || toAcc.kind !== "checking") {
    throw new Error("A transferência só é permitida entre contas correntes.")
  }
  if (fromAcc.id === toAcc.id) {
    throw new Error("Origem e destino devem ser contas diferentes.")
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Informe um valor maior que zero.")
  }
  const date = input.date.trim()
  if (!date) throw new Error("Informe a data.")
  parseISODateParts(date)
  if (date > todayISODate()) {
    throw new Error("Não é possível registrar transferência em data futura.")
  }

  const available = accountNetBalanceThroughDate(
    transactionsRepo.list(),
    fromAcc.id,
    date
  )
  if (available < input.amount) {
    throw new Error(
      "Saldo insuficiente na conta de origem para esta data e valor."
    )
  }

  const description =
    typeof input.description === "string" ? input.description : ""
  const groupId = crypto.randomUUID()
  const outTitle = `Transferência para ${toAcc.name.trim()}`
  const inTitle = `Transferência de ${fromAcc.name.trim()}`

  const common = {
    amount: input.amount,
    paymentMethod: "account_transfer" as const,
    date,
    description,
    transferGroupId: groupId,
  }

  let outgoing: Transaction
  try {
    outgoing = createTransaction({
      ...common,
      title: outTitle,
      type: "expense",
      accountId: fromAcc.id,
    })
  } catch (e) {
    throw e
  }
  try {
    const incoming = createTransaction({
      ...common,
      title: inTitle,
      type: "income",
      accountId: toAcc.id,
    })
    return { outgoingId: outgoing.id, incomingId: incoming.id }
  } catch (e) {
    transactionsRepo.remove(outgoing.id)
    throw e instanceof Error
      ? e
      : new Error("Não foi possível concluir a transferência.")
  }
}

// ——— Recorrências ———

export function listRecurringRules(): RecurringRule[] {
  migrateCategoriesFromLegacyOnce()
  return recurringRepo.list()
}

export function getRecurringRuleById(id: string): RecurringRule | undefined {
  migrateCategoriesFromLegacyOnce()
  return recurringRepo.getById(id)
}

export function createRecurringRule(input: CreateRecurringRuleInput): RecurringRule {
  migrateCategoriesFromLegacyOnce()
  if (!assertCreateRecurringRuleInput(input)) {
    throw new Error("Dados de recorrência inválidos.")
  }
  assertTransactionCardConsistency({
    paymentMethod: input.paymentMethod,
    cardId: input.cardId,
  })
  const accountId = normalizeAccountId(input.accountId)
  assertTransactionAccountConsistency({
    accountId,
  })
  const now = new Date().toISOString()
  return recurringRepo.create(() => {
    const autoPost =
      input.frequency === "monthly" ? (input.autoPost ?? false) : false
    const common = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      logoDataUrl: input.logoDataUrl,
      amount: input.amount,
      type: input.type,
      categoryId: input.categoryId.trim(),
      paymentMethod: input.paymentMethod,
      accountId: accountId as string,
      cardId: input.cardId?.trim(),
      description: input.description,
      active: input.active,
      autoPost,
      createdAt: now,
      updatedAt: now,
    } as const

    if (input.frequency === "monthly") {
      return {
        ...common,
        frequency: "monthly" as const,
        dayOfMonth: input.dayOfMonth!,
        weekday: undefined,
      }
    }
    return {
      ...common,
      frequency: "weekly" as const,
      weekday: input.weekday!,
      dayOfMonth: undefined,
    }
  })
}

export function updateRecurringRule(
  input: UpdateRecurringRuleInput
): RecurringRule | null {
  migrateCategoriesFromLegacyOnce()
  const current = recurringRepo.getById(input.id)
  if (!current) return null

  const { id, ...rest } = input
  const patch = omitUndefined(rest) as Partial<Omit<RecurringRule, "id">>
  const merged: RecurringRule = {
    ...current,
    ...patch,
    id: current.id,
  }

  if (merged.frequency === "weekly") {
    merged.autoPost = false
  }

  if (merged.frequency === "monthly") {
    if (
      merged.dayOfMonth === undefined ||
      !Number.isFinite(merged.dayOfMonth) ||
      merged.dayOfMonth < 1 ||
      merged.dayOfMonth > 31
    ) {
      return null
    }
    merged.weekday = undefined
  } else {
    if (
      merged.weekday === undefined ||
      !Number.isFinite(merged.weekday) ||
      merged.weekday < 0 ||
      merged.weekday > 6
    ) {
      return null
    }
    merged.dayOfMonth = undefined
  }

  if (!merged.title.trim()) return null
  if (!Number.isFinite(merged.amount) || merged.amount <= 0) return null
  if (typeof merged.description !== "string") return null
  if (
    merged.paymentMethod !== "pix" &&
    merged.paymentMethod !== "debit_card" &&
    merged.paymentMethod !== "credit_card" &&
    merged.paymentMethod !== "boleto" &&
    merged.paymentMethod !== "cash"
  ) {
    return null
  }
  if (typeof merged.active !== "boolean") return null
  if (typeof merged.autoPost !== "boolean") return null
  if (typeof merged.logoDataUrl !== "string") return null
  if (merged.frequency !== "monthly" && merged.frequency !== "weekly") {
    return null
  }

  const accountId = normalizeAccountId(merged.accountId)
  if (!accountId) return null
  merged.accountId = accountId

  try {
    assertTransactionCardConsistency({
      paymentMethod: merged.paymentMethod,
      cardId: merged.cardId,
    })
    assertTransactionAccountConsistency({
      accountId: merged.accountId,
    })
  } catch {
    return null
  }

  const nextPatch: Partial<Omit<RecurringRule, "id" | "createdAt">> = {
    title: merged.title.trim(),
    logoDataUrl: merged.logoDataUrl,
    amount: merged.amount,
    type: merged.type,
    categoryId: merged.categoryId.trim(),
    paymentMethod: merged.paymentMethod,
    accountId,
    cardId: merged.cardId?.trim(),
    description: merged.description,
    frequency: merged.frequency,
    active: merged.active,
    autoPost: merged.autoPost,
    lastPostedAt: merged.lastPostedAt,
    lastAutoPostedMonthKey: merged.lastAutoPostedMonthKey,
    updatedAt: new Date().toISOString(),
  }
  if (merged.frequency === "monthly") {
    nextPatch.dayOfMonth = merged.dayOfMonth
    nextPatch.weekday = undefined
  } else {
    nextPatch.weekday = merged.weekday
    nextPatch.dayOfMonth = undefined
  }

  return recurringRepo.update(id, nextPatch)
}

export function deleteRecurringRule(id: string): boolean {
  migrateCategoriesFromLegacyOnce()
  return recurringRepo.remove(id)
}

export function launchRecurringRule(
  id: string,
  dateISO: string,
  launchAmount?: number,
  updateRecurringAmount = false
): Transaction {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()

  const rule = recurringRepo.getById(id)
  if (!rule) {
    throw new Error("Recorrência não encontrada.")
  }
  if (!rule.active) {
    throw new Error("Ative a recorrência para lançar.")
  }
  const date = dateISO.trim()
  if (!date) {
    throw new Error("Informe a data do lançamento.")
  }
  const amount = launchAmount ?? rule.amount
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor válido para o lançamento.")
  }

  const tx = createTransaction({
    title: rule.title,
    amount,
    type: rule.type,
    categoryId: rule.categoryId,
    paymentMethod: rule.paymentMethod,
    accountId: rule.accountId,
    cardId: rule.cardId,
    date,
    description: rule.description,
  })

  const launchTimestamp = `${date}T00:00:00.000Z`
  const now = new Date().toISOString()
  recurringRepo.update(rule.id, {
    amount: updateRecurringAmount ? amount : rule.amount,
    // "Último lançamento" deve refletir a data efetiva lançada pelo usuário.
    lastPostedAt: launchTimestamp,
    updatedAt: now,
  })

  return tx
}

/**
 * Recorrências mensais com autopost: cria o lançamento uma vez no mês,
 * no dia configurado ou depois, ao carregar o app.
 */
export function sweepAutoPostRecurringRules(): void {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()

  const now = new Date()
  const monthKey = localMonthKey(now)
  const today = now.getDate()

  for (const rule of recurringRepo.list()) {
    if (!rule.active || !rule.autoPost || rule.frequency !== "monthly") {
      continue
    }
    if (rule.lastAutoPostedMonthKey === monthKey) continue
    if (rule.dayOfMonth === undefined) continue

    const schedDay = scheduledPostingDayThisMonth(now, rule.dayOfMonth)
    if (today < schedDay) continue

    const y = now.getFullYear()
    const m0 = now.getMonth()
    const dateISO = localISODateYearMonthDay(y, m0, schedDay)

    try {
      createTransaction({
        title: rule.title,
        amount: rule.amount,
        type: rule.type,
        categoryId: rule.categoryId,
        paymentMethod: rule.paymentMethod,
        accountId: rule.accountId,
        cardId: rule.cardId,
        date: dateISO,
        description: rule.description,
      })
    } catch {
      continue
    }

    const launchTimestamp = `${dateISO}T00:00:00.000Z`
    const ts = new Date().toISOString()
    recurringRepo.update(rule.id, {
      lastAutoPostedMonthKey: monthKey,
      // Mantém consistência com lançamento manual: data do movimento.
      lastPostedAt: launchTimestamp,
      updatedAt: ts,
    })
  }
}

// ——— Parceladas ———

function recomputeInstallmentPlanStatus(
  plan: InstallmentPlan
): InstallmentPlan["status"] {
  if (plan.installments.every((i) => i.status === "cancelled")) return "cancelled"
  if (plan.installments.every((i) => i.status === "posted" || i.status === "cancelled")) {
    return plan.installments.some((i) => i.status === "cancelled")
      ? "cancelled"
      : "completed"
  }
  return "active"
}

function assertDeleteInstallmentPlanAllowed(plan: InstallmentPlan): void {
  const hasPosted = plan.installments.some((i) => i.status === "posted")
  if (hasPosted && plan.status !== "completed") {
    throw new Error(
      "Não é possível excluir um parcelamento com parcelas já lançadas em fatura."
    )
  }
}

function recomputeInstallmentBuckets(
  installments: Installment[]
): Pick<InstallmentPlan, "reservedAmount" | "postedAmount"> {
  let reservedAmount = 0
  let postedAmount = 0
  for (const i of installments) {
    if (i.status === "reserved") reservedAmount += i.amount
    if (i.status === "posted") postedAmount += i.settledAmount ?? i.amount
  }
  return { reservedAmount, postedAmount }
}

export function listInstallmentPlans(): InstallmentPlan[] {
  migrateCategoriesFromLegacyOnce()
  return installmentPlansRepo.list()
}

export function getInstallmentPlanById(id: string): InstallmentPlan | undefined {
  migrateCategoriesFromLegacyOnce()
  return installmentPlansRepo.getById(id)
}

export function createInstallmentPlan(
  input: CreateInstallmentPlanInput
): InstallmentPlan {
  migrateCategoriesFromLegacyOnce()
  if (!assertCreateInstallmentPlanInput(input)) {
    throw new Error("Dados de parcelamento inválidos.")
  }
  const category = getCategoryById(input.categoryId.trim())
  if (!category) throw new Error("Categoria não encontrada.")
  if (!categoryAcceptsTransactionType(category, input.type)) {
    throw new Error("Tipo de lançamento incompatível com a categoria.")
  }
  assertTransactionCardConsistency({
    paymentMethod: input.paymentMethod,
    cardId: input.cardId,
  })
  const accountId = normalizeAccountId(input.accountId)
  assertTransactionAccountConsistency({ accountId })

  const normalizedCount = Math.floor(input.installmentCount)
  if (normalizedCount < 1) {
    throw new Error("Quantidade de parcelas inválida.")
  }
  const firstDueDate = input.firstDueDate.trim()
  parseISODateParts(firstDueDate)
  const amounts = splitInstallmentAmounts(input.totalAmount, normalizedCount)
  const normalizedCardId = input.cardId?.trim() || undefined

  if (input.paymentMethod === "credit_card" && normalizedCardId) {
    const card = getCardById(normalizedCardId)
    if (!card) throw new Error("Cartão não encontrado.")
    const outstanding = totalCreditOutstanding(transactionsRepo.list(), card)
    const reservedCurrent = sumReservedByCardId(
      installmentPlansRepo.list(),
      normalizedCardId
    )
    const effectiveAvailable = card.limit - outstanding - reservedCurrent
    if (input.totalAmount > effectiveAvailable) {
      throw new Error(
        "Limite insuficiente: o valor parcelado excede o disponível considerando reservas."
      )
    }
  }

  const now = new Date().toISOString()
  const autoPost = input.autoPost ?? false
  const installments: Installment[] = amounts.map((amount, index) => ({
    id: crypto.randomUUID(),
    number: index + 1,
    amount,
    dueDate: addMonthsPreservingDay(firstDueDate, index),
    status: "reserved",
    postedAt: undefined,
    paymentTransactionId: undefined,
  }))
  const buckets = recomputeInstallmentBuckets(installments)

  return installmentPlansRepo.create(() => ({
    id: crypto.randomUUID(),
    title: input.title.trim(),
    logoDataUrl: input.logoDataUrl,
    walletAccentHex: normalizeWalletAccentHex(input.walletAccentHex),
    totalAmount: input.totalAmount,
    installmentCount: normalizedCount,
    type: input.type,
    categoryId: input.categoryId.trim(),
    paymentMethod: input.paymentMethod,
    accountId: accountId as string,
    cardId: normalizedCardId,
    description: input.description,
    autoPost,
    status: "active",
    reservedAmount: buckets.reservedAmount,
    postedAmount: buckets.postedAmount,
    installments,
    createdAt: now,
    updatedAt: now,
  }))
}

export function updateInstallmentPlan(
  input: UpdateInstallmentPlanInput
): InstallmentPlan | null {
  migrateCategoriesFromLegacyOnce()
  const current = installmentPlansRepo.getById(input.id)
  if (!current) return null
  const { id, ...rest } = input
  const patch = omitUndefined(rest) as Partial<Omit<InstallmentPlan, "id">>
  const merged: InstallmentPlan = { ...current, ...patch, id: current.id }

  if (!merged.title.trim()) return null
  if (typeof merged.logoDataUrl !== "string") return null
  merged.walletAccentHex = normalizeWalletAccentHex(
    typeof merged.walletAccentHex === "string" ? merged.walletAccentHex : ""
  )
  if (typeof merged.autoPost !== "boolean") return null
  if (!Number.isFinite(merged.totalAmount) || merged.totalAmount <= 0) return null
  if (!Number.isFinite(merged.installmentCount) || merged.installmentCount < 1) {
    return null
  }
  if (
    merged.paymentMethod !== "pix" &&
    merged.paymentMethod !== "debit_card" &&
    merged.paymentMethod !== "credit_card" &&
    merged.paymentMethod !== "boleto" &&
    merged.paymentMethod !== "cash"
  ) {
    return null
  }
  const accountId = normalizeAccountId(merged.accountId)
  if (!accountId) return null
  merged.accountId = accountId
  const category = getCategoryById(merged.categoryId)
  if (!category) return null
  if (!categoryAcceptsTransactionType(category, merged.type)) return null

  try {
    assertTransactionCardConsistency({
      paymentMethod: merged.paymentMethod,
      cardId: merged.cardId,
    })
    assertTransactionAccountConsistency({ accountId: merged.accountId })
  } catch {
    return null
  }

  const hasPosted = current.installments.some((i) => i.status === "posted")
  if (merged.installmentCount !== current.installmentCount) {
    return null
  }

  let nextInstallments = current.installments
  let nextBuckets = {
    reservedAmount: current.reservedAmount,
    postedAmount: current.postedAmount,
  }
  const totalAmountChanged = merged.totalAmount !== current.totalAmount
  if (totalAmountChanged) {
    if (hasPosted) {
      return null
    }
    const amounts = splitInstallmentAmounts(merged.totalAmount, merged.installmentCount)
    nextInstallments = current.installments.map((installment, index) => ({
      ...installment,
      amount: amounts[index] ?? installment.amount,
    }))
    nextBuckets = recomputeInstallmentBuckets(nextInstallments)
  }

  if (hasPosted) {
    if (
      merged.paymentMethod !== current.paymentMethod ||
      (merged.cardId?.trim() || undefined) !== (current.cardId?.trim() || undefined)
    ) {
      return null
    }
  }

  if (merged.paymentMethod === "credit_card" && merged.cardId) {
    const card = getCardById(merged.cardId)
    if (!card) return null
    const outstanding = totalCreditOutstanding(transactionsRepo.list(), card)
    const reservedWithoutCurrent = sumReservedByCardId(
      installmentPlansRepo.list(),
      card.id,
      current.id
    )
    const effectiveAvailable = card.limit - outstanding - reservedWithoutCurrent
    const thisPlanReserved = nextBuckets.reservedAmount
    if (thisPlanReserved > effectiveAvailable) return null
  }

  return installmentPlansRepo.update(id, {
    title: merged.title.trim(),
    logoDataUrl: merged.logoDataUrl,
    walletAccentHex: normalizeWalletAccentHex(merged.walletAccentHex),
    totalAmount: merged.totalAmount,
    installments: nextInstallments,
    type: merged.type,
    categoryId: merged.categoryId.trim(),
    paymentMethod: merged.paymentMethod,
    accountId: merged.accountId,
    cardId: merged.cardId?.trim() || undefined,
    description: merged.description,
    autoPost: merged.autoPost,
    reservedAmount: nextBuckets.reservedAmount,
    postedAmount: nextBuckets.postedAmount,
    updatedAt: new Date().toISOString(),
  })
}

export function deleteInstallmentPlan(id: string): boolean {
  const plan = installmentPlansRepo.getById(id)
  if (!plan) return false
  assertDeleteInstallmentPlanAllowed(plan)
  return installmentPlansRepo.remove(id)
}

export type PayInstallmentOptions = {
  /** Data do movimento no extrato / conta (padrão: `paymentDateISO`). */
  transactionDateIso?: string
}

function closingIsoForInstallmentDue(
  installmentDueIso: string,
  card: Pick<Card, "closingDay" | "dueDay">
): string {
  const due = parseISODateParts(installmentDueIso)
  let closingYear = due.year
  let closingMonth1 = due.month
  // Mesmo critério de dueDateForStatementClosing: quando dueDay <= closingDay,
  // o vencimento é no mês seguinte ao fechamento.
  if (card.dueDay <= card.closingDay) {
    if (closingMonth1 === 1) {
      closingMonth1 = 12
      closingYear -= 1
    } else {
      closingMonth1 -= 1
    }
  }
  const closeDom = Math.min(card.closingDay, daysInMonth(closingYear, closingMonth1))
  return `${closingYear}-${pad2(closingMonth1)}-${pad2(closeDom)}`
}

function cycleStartIsoForClosing(
  closingIso: string,
  card: Pick<Card, "closingDay">
): string {
  const closing = parseISODateParts(closingIso)
  let prevYear = closing.year
  let prevMonth1 = closing.month
  if (prevMonth1 === 1) {
    prevMonth1 = 12
    prevYear -= 1
  } else {
    prevMonth1 -= 1
  }
  const prevCloseDom = Math.min(card.closingDay, daysInMonth(prevYear, prevMonth1))
  const start = new Date(prevYear, prevMonth1 - 1, prevCloseDom)
  start.setDate(start.getDate() + 1)
  return localISODateYearMonthDay(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  )
}

function installmentReservedForAutoPost(
  plan: InstallmentPlan,
  inst: Installment,
  todayISO: string,
  card: Card | undefined
): boolean {
  if (inst.status !== "reserved") return false
  if (plan.paymentMethod !== "credit_card" || !card) {
    return inst.dueDate <= todayISO
  }
  const targetClosingIso = closingIsoForInstallmentDue(inst.dueDate, card)
  const cycleStartIso = cycleStartIsoForClosing(targetClosingIso, card)
  // Só lança quando o ciclo correto da parcela já abriu.
  return todayISO >= cycleStartIso
}

function installmentAutoPostLedgerDate(
  plan: InstallmentPlan,
  inst: Installment,
  todayISO: string,
  card: Card | undefined
): string {
  if (plan.paymentMethod !== "credit_card" || !card) {
    return inst.dueDate
  }
  const targetClosingIso = closingIsoForInstallmentDue(inst.dueDate, card)
  // Enquanto o ciclo está aberto, usa "hoje"; após fechamento, retroage para o
  // fechamento do ciclo para preservar a fatura correta.
  if (todayISO <= targetClosingIso) {
    return todayISO
  }
  return targetClosingIso
}

export function payInstallment(
  planId: string,
  installmentId: string,
  paymentDateISO: string,
  settledAmount?: number,
  options?: PayInstallmentOptions
): InstallmentPlan {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  const plan = installmentPlansRepo.getById(planId)
  if (!plan) throw new Error("Parcelamento não encontrado.")
  const target = plan.installments.find((i) => i.id === installmentId)
  if (!target) throw new Error("Parcela não encontrada.")
  if (plan.status === "cancelled") {
    throw new Error("Parcelamento cancelado não permite novos lançamentos.")
  }
  if (target.status === "posted") {
    throw new Error("Parcela já foi lançada na fatura.")
  }
  if (target.status === "cancelled") {
    throw new Error("Parcela cancelada não pode ser lançada.")
  }
  const date = paymentDateISO.trim()
  if (!date) throw new Error("Informe a data de lançamento.")
  parseISODateParts(date)
  const txDate = options?.transactionDateIso?.trim() || date
  if (!txDate) throw new Error("Informe a data de lançamento.")
  parseISODateParts(txDate)
  if (txDate > todayISODate()) {
    throw new Error("Não é possível registrar lançamento em data futura.")
  }
  const normalizedSettledAmount = settledAmount ?? target.amount
  if (!Number.isFinite(normalizedSettledAmount) || normalizedSettledAmount <= 0) {
    throw new Error("Informe um valor válido para o lançamento.")
  }
  if (normalizedSettledAmount > target.amount) {
    throw new Error("O valor com desconto não pode ser maior que a parcela.")
  }

  const tx = createTransaction({
    title: `${plan.title} (${target.number}/${plan.installmentCount})`,
    amount: normalizedSettledAmount,
    type: plan.type,
    categoryId: plan.categoryId,
    paymentMethod: plan.paymentMethod,
    accountId: plan.accountId,
    cardId: plan.cardId,
    date: txDate,
    description: plan.description,
  })

  const now = new Date().toISOString()
  const installments = plan.installments.map((i) =>
    i.id === installmentId
      ? {
          ...i,
          status: "posted" as const,
          postedAt: txDate,
          settledAmount: normalizedSettledAmount,
          paymentTransactionId: tx.id,
        }
      : i
  )
  const buckets = recomputeInstallmentBuckets(installments)
  const status = recomputeInstallmentPlanStatus({ ...plan, installments })
  const next = installmentPlansRepo.update(plan.id, {
    installments,
    status,
    reservedAmount: buckets.reservedAmount,
    postedAmount: buckets.postedAmount,
    updatedAt: now,
  })
  if (!next) {
    throw new Error("Não foi possível atualizar o parcelamento.")
  }
  return next
}

/**
 * Parcelamentos com autoPost:
 * - Crédito: cada parcela lança quando o ciclo correto abre e com data ajustada para
 *   garantir entrada na fatura esperada (comportamento equivalente a compras no cartão).
 * - Débito/caixa: lança somente em `dueDate <= hoje`.
 */
export function sweepAutoPostInstallmentPlans(): void {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()

  const todayISO = localTodayISODate()

  for (const plan of installmentPlansRepo.list()) {
    if (plan.status !== "active" || !plan.autoPost) continue

    let current: InstallmentPlan | undefined = plan
    while (current && current.status === "active" && current.autoPost) {
      const activePlan = current
      const card =
        activePlan.paymentMethod === "credit_card" && activePlan.cardId
          ? getCardById(activePlan.cardId)
          : undefined
      const candidates = activePlan.installments.filter((i) =>
        installmentReservedForAutoPost(activePlan, i, todayISO, card)
      )
      if (candidates.length === 0) break
      candidates.sort((a, b) => {
        const byDue = a.dueDate.localeCompare(b.dueDate)
        if (byDue !== 0) return byDue
        return a.number - b.number
      })
      const nextInst = candidates[0]
      const ledgerDate = installmentAutoPostLedgerDate(
        activePlan,
        nextInst,
        todayISO,
        card
      )
      try {
        current = payInstallment(activePlan.id, nextInst.id, nextInst.dueDate, undefined, {
          transactionDateIso: ledgerDate,
        })
      } catch {
        break
      }
    }
  }
}

export function cancelInstallmentPlan(id: string): InstallmentPlan {
  const plan = installmentPlansRepo.getById(id)
  if (!plan) throw new Error("Parcelamento não encontrado.")
  if (plan.status === "cancelled") return plan
  if (plan.status === "completed") {
    throw new Error("Parcelamento concluído não pode ser cancelado.")
  }

  const now = new Date().toISOString()
  const installments = plan.installments.map((i) =>
    i.status === "reserved" ? { ...i, status: "cancelled" as const } : i
  )
  const buckets = recomputeInstallmentBuckets(installments)
  const next = installmentPlansRepo.update(plan.id, {
    installments,
    status: "cancelled",
    reservedAmount: buckets.reservedAmount,
    postedAmount: buckets.postedAmount,
    updatedAt: now,
  })
  if (!next) throw new Error("Não foi possível cancelar o parcelamento.")
  return next
}

// ——— Compatibilidade com chamadas antigas (substituição em lote) ———

export function saveCategories(categories: Category[]): void {
  migrateCategoriesFromLegacyOnce()
  categoriesRepo.replaceAll(categories)
}

export function saveCards(cards: Card[]): void {
  cardsRepo.replaceAll(cards)
}

export function saveAccounts(accounts: Account[]): void {
  accountsRepo.replaceAll(accounts)
}

export function saveTransactions(transactions: Transaction[]): void {
  migrateCategoriesFromLegacyOnce()
  migrateTransactionsFromLegacyOnce()
  transactionsRepo.replaceAll(transactions)
}

export { createLocalStorageRepository, parseStoredCollection } from "./generic-repository"
