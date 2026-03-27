import type { Penalty, PenaltyBracket } from '@/types'

/**
 * Retorna el tram de penalització aplicable segons les quotes restants.
 * Cerca el tram amb el mesosMinim més alt que sigui < quotesRestants.
 * Si cap coincideix, retorna el tram per defecte (mesosMinim = 0).
 */
export function resolveApplicableBracket(
  penalty: Penalty,
  quotesRestants: number
): PenaltyBracket {
  const sorted = [...penalty.brackets].sort((a, b) => b.mesosMinim - a.mesosMinim)
  for (const bracket of sorted) {
    if (quotesRestants > bracket.mesosMinim) {
      return bracket
    }
  }
  // Fallback al tram per defecte
  return sorted[sorted.length - 1] ?? { mesosMinim: 0, valor: 0, tipus: 'percentatge' }
}

/**
 * Calcula l'import de la penalització en € donats el capital i les quotes restants.
 */
export function calcularPenalitzacio(
  penalty: Penalty,
  capitalPendent: number,
  quotesRestants: number
): number {
  const bracket = resolveApplicableBracket(penalty, quotesRestants)
  if (bracket.tipus === 'percentatge') {
    return round2((capitalPendent * bracket.valor) / 100)
  }
  return bracket.valor
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
