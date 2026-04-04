import { useCallback, useState } from "react"

import {
  addSavingsGoalContribution,
  createSavingsGoal,
  deleteSavingsGoal,
  getSavingsGoalById,
  listSavingsGoals,
  removeSavingsGoalContribution,
  updateSavingsGoal,
} from "@/services/localStorage/finance-storage"
import type {
  CreateSavingsGoalInput,
  SavingsGoal,
  UpdateSavingsGoalInput,
} from "@/types/savings-goal"

export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>(() => listSavingsGoals())

  const refresh = useCallback(() => {
    setGoals(listSavingsGoals())
  }, [])

  const create = useCallback(
    (input: CreateSavingsGoalInput) => {
      createSavingsGoal(input)
      refresh()
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdateSavingsGoalInput) => {
      const next = updateSavingsGoal(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteSavingsGoal(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  const addContribution = useCallback(
    (input: {
      goalId: string
      amount: number
      accountId: string
      date?: string
      note?: string
    }) => {
      const next = addSavingsGoalContribution(input)
      refresh()
      return next
    },
    [refresh]
  )

  const removeContribution = useCallback(
    (goalId: string, contributionId: string) => {
      const next = removeSavingsGoalContribution(goalId, contributionId)
      refresh()
      return next
    },
    [refresh]
  )

  return {
    goals,
    refresh,
    create,
    update,
    remove,
    addContribution,
    removeContribution,
    getById: getSavingsGoalById,
  }
}
