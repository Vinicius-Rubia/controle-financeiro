import { useCallback, useState } from "react"

import {
  createPlannedPayment,
  deletePlannedPayment,
  getPlannedPaymentById,
  listPlannedPayments,
  updatePlannedPayment,
} from "@/services/localStorage/finance-storage"
import type {
  CreatePlannedPaymentInput,
  PlannedPayment,
  UpdatePlannedPaymentInput,
} from "@/types/planned-payment"

export function usePlannedPayments() {
  const [plannedPayments, setPlannedPayments] = useState<PlannedPayment[]>(() =>
    listPlannedPayments()
  )

  const refresh = useCallback(() => {
    setPlannedPayments(listPlannedPayments())
  }, [])

  const create = useCallback(
    (input: CreatePlannedPaymentInput) => {
      createPlannedPayment(input)
      refresh()
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdatePlannedPaymentInput) => {
      const next = updatePlannedPayment(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deletePlannedPayment(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  return {
    plannedPayments,
    refresh,
    create,
    update,
    remove,
    getById: getPlannedPaymentById,
  }
}
