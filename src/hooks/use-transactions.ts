import { useCallback, useState } from "react"

import {
  createAccountTransfer,
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
} from "@/services/localStorage/finance-storage"
import type {
  CreateAccountTransferInput,
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from "@/types/transaction"

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    listTransactions()
  )

  const refresh = useCallback(() => {
    setTransactions(listTransactions())
  }, [])

  const create = useCallback(
    (input: CreateTransactionInput) => {
      createTransaction(input)
      refresh()
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdateTransactionInput) => {
      const next = updateTransaction(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteTransaction(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  const transferBetweenAccounts = useCallback(
    (input: CreateAccountTransferInput) => {
      createAccountTransfer(input)
      refresh()
    },
    [refresh]
  )

  return {
    transactions,
    refresh,
    create,
    update,
    remove,
    transferBetweenAccounts,
    getById: getTransactionById,
  }
}
