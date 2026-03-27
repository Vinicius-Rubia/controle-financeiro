import type { Card } from "@/types/card"
import type { PaymentMethod } from "@/types/transaction"

export function cardSupportsPaymentMethod(
  _card: Card,
  paymentMethod: PaymentMethod
): boolean {
  return (
    paymentMethod === "credit_card" || paymentMethod === "credit_card_settlement"
  )
}
