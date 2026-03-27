import { useCallback, useState } from "react"

import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRuleById,
  launchRecurringRule,
  listRecurringRules,
  updateRecurringRule,
} from "@/services/localStorage/finance-storage"
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  UpdateRecurringRuleInput,
} from "@/types/recurring"
import type { Transaction } from "@/types/transaction"

export function useRecurringRules() {
  const [rules, setRules] = useState<RecurringRule[]>(() =>
    listRecurringRules()
  )

  const refresh = useCallback(() => {
    setRules(listRecurringRules())
  }, [])

  const create = useCallback(
    (input: CreateRecurringRuleInput) => {
      createRecurringRule(input)
      refresh()
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdateRecurringRuleInput) => {
      const next = updateRecurringRule(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteRecurringRule(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  const launch = useCallback(
    (
      id: string,
      dateISO: string,
      launchAmount?: number,
      updateRecurringAmount = false
    ): Transaction => {
      const tx = launchRecurringRule(id, dateISO, launchAmount, updateRecurringAmount)
      refresh()
      return tx
    },
    [refresh]
  )

  return {
    rules,
    refresh,
    create,
    update,
    remove,
    launch,
    getById: getRecurringRuleById,
  }
}
