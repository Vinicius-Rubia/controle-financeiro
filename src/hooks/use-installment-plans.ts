import { useCallback, useState } from "react"

import {
  cancelInstallmentPlan,
  createInstallmentPlan,
  deleteInstallmentPlan,
  getInstallmentPlanById,
  listInstallmentPlans,
  payInstallment,
  updateInstallmentPlan,
} from "@/services/localStorage/finance-storage"
import type {
  CreateInstallmentPlanInput,
  InstallmentPlan,
  UpdateInstallmentPlanInput,
} from "@/types/installment"

export function useInstallmentPlans() {
  const [plans, setPlans] = useState<InstallmentPlan[]>(() => listInstallmentPlans())

  const refresh = useCallback(() => {
    setPlans(listInstallmentPlans())
  }, [])

  const create = useCallback(
    (input: CreateInstallmentPlanInput) => {
      createInstallmentPlan(input)
      refresh()
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdateInstallmentPlanInput) => {
      const next = updateInstallmentPlan(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteInstallmentPlan(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  const pay = useCallback(
    (
      planId: string,
      installmentId: string,
      paymentDateISO: string,
      settledAmount?: number
    ) => {
      const next = payInstallment(planId, installmentId, paymentDateISO, settledAmount)
      refresh()
      return next
    },
    [refresh]
  )

  const cancel = useCallback(
    (id: string) => {
      const next = cancelInstallmentPlan(id)
      refresh()
      return next
    },
    [refresh]
  )

  return {
    plans,
    refresh,
    create,
    update,
    remove,
    cancel,
    payInstallment: pay,
    getById: getInstallmentPlanById,
  }
}
