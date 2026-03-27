export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && isFinite(value)
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && isFinite(value)
}

export function isValidPercentage(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100 && isFinite(value)
}

export function generateId(): string {
  return crypto.randomUUID()
}

/** Arrodoneix a 2 decimals. Per a camps d'euros. */
export function parseEuros(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100) / 100
}
