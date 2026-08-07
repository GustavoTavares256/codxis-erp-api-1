export type InstallmentDraft = { number: number; amount: number; dueDate: Date }

export function buildInstallments(totalAmount: number, count: number, firstDueDate: Date): InstallmentDraft[] {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error('O valor total deve ser positivo')
  if (!Number.isInteger(count) || count < 1 || count > 120) throw new Error('A quantidade de parcelas deve estar entre 1 e 120')
  if (Number.isNaN(firstDueDate.getTime())) throw new Error('O primeiro vencimento é inválido')
  const totalCents = Math.round(totalAmount * 100)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count
  return Array.from({ length: count }, (_, index) => ({ number: index + 1, amount: (baseCents + (index < remainder ? 1 : 0)) / 100, dueDate: addMonths(firstDueDate, index) }))
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}
