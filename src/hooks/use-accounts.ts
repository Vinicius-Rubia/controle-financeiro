import { useCallback, useState } from "react"

import {
  createAccount,
  deleteAccount,
  getAccountById,
  listAccounts,
  updateAccount,
} from "@/services/localStorage/finance-storage"
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from "@/types/account"

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>(() => listAccounts())

  const refresh = useCallback(() => {
    setAccounts(listAccounts())
  }, [])

  const create = useCallback(
    (input: CreateAccountInput) => {
      const created = createAccount(input)
      refresh()
      return created
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdateAccountInput) => {
      const next = updateAccount(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteAccount(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  return {
    accounts,
    refresh,
    create,
    update,
    remove,
    getById: getAccountById,
  }
}
