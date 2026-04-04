import type { SavingsGoal } from "@/types/savings-goal"

export function totalSavedForGoal(goal: SavingsGoal): number {
  return goal.contributions.reduce((sum, c) => sum + c.amount, 0)
}

/** Soma aportes cuja data cai no mês/ano informados (calendário local). */
export function savedInCalendarMonth(
  goal: SavingsGoal,
  year: number,
  month1to12: number
): number {
  const prefix = `${year}-${String(month1to12).padStart(2, "0")}`
  return goal.contributions
    .filter((c) => c.date.startsWith(prefix))
    .reduce((sum, c) => sum + c.amount, 0)
}

export function savedThisMonth(goal: SavingsGoal, now = new Date()): number {
  return savedInCalendarMonth(goal, now.getFullYear(), now.getMonth() + 1)
}
