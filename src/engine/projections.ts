import type { ProjectionEntry } from '@/types'

/**
 * Resol les projeccions d'Euríbor per a un rang d'anys.
 * Si un any té euribor: null, hereta el valor de l'any anterior.
 * Si no hi ha projeccions o el primer any no té valor, usa euriborActual com a fallback.
 */
export function resolveEuriborProjections(
  projections: ProjectionEntry[],
  euriborActual: number,
  anyInici: number,
  anyFi: number
): Map<number, number> {
  const result = new Map<number, number>()
  const projMap = new Map<number, number | null>()

  for (const entry of projections) {
    projMap.set(entry.any, entry.euribor)
  }

  let lastValue = euriborActual

  for (let year = anyInici; year <= anyFi; year++) {
    if (projMap.has(year)) {
      const val = projMap.get(year)!
      if (val !== null) {
        lastValue = val
      }
      // Si és null, lastValue ja conté l'heretat
    }
    result.set(year, lastValue)
  }

  return result
}

/**
 * Retorna l'Euríbor aplicable per a un mes donat,
 * considerant la data de propera revisió i les projeccions.
 * El tipus es revisa anualment a la data de revisió.
 */
export function getEuriborPerMes(
  mesIndex: number, // 1-based, relatiu a l'inici del préstec
  euriborActual: number,
  diferencial: number,
  dataProperaRevisio: string | undefined,
  projections: ProjectionEntry[],
  dataInici: Date
): number {
  if (!dataProperaRevisio) {
    return euriborActual + diferencial
  }

  const revisio = new Date(dataProperaRevisio)
  const mesActual = new Date(dataInici)
  mesActual.setMonth(mesActual.getMonth() + mesIndex - 1)

  // Abans de la primera revisió, usar euríbor actual
  if (mesActual < revisio) {
    return euriborActual + diferencial
  }

  // Després de la primera revisió, usar la projecció de l'any corresponent
  const anyActual = mesActual.getFullYear()
  const anyRevisio = revisio.getFullYear()
  const anyFi = anyActual + 1

  const resolved = resolveEuriborProjections(
    projections,
    euriborActual,
    anyRevisio,
    anyFi
  )

  const euribor = resolved.get(anyActual) ?? euriborActual
  return euribor + diferencial
}
