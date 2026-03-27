import { useCallback, useState } from "react"

import {
  createCard,
  deleteCard,
  getCardById,
  listCards,
  updateCard,
} from "@/services/localStorage/finance-storage"
import type { Card, CreateCardInput, UpdateCardInput } from "@/types/card"

export function useCards() {
  const [cards, setCards] = useState<Card[]>(() => listCards())

  const refresh = useCallback(() => {
    setCards(listCards())
  }, [])

  const create = useCallback(
    (input: CreateCardInput) => {
      const created = createCard(input)
      refresh()
      return created
    },
    [refresh]
  )

  const update = useCallback(
    (input: UpdateCardInput) => {
      const next = updateCard(input)
      refresh()
      return next
    },
    [refresh]
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteCard(id)
      if (ok) refresh()
      return ok
    },
    [refresh]
  )

  return {
    cards,
    refresh,
    create,
    update,
    remove,
    getById: getCardById,
  }
}
