import type { Scenario, AppState } from '@/types'
import { calcularResultatEscenari, type ResultatEscenari } from './refinancing'

export interface ScenarioComparison {
  scenarioId: string
  nom: string
  resultat: ResultatEscenari
}

/**
 * Calcula i compara múltiples escenaris, ordenats per estalvi net (de major a menor).
 */
export function compararEscenaris(
  escenaris: Scenario[],
  state: AppState
): ScenarioComparison[] {
  return escenaris
    .map((scenario) => ({
      scenarioId: scenario.id,
      nom: scenario.nom,
      resultat: calcularResultatEscenari(scenario, state),
    }))
    .sort((a, b) => b.resultat.estalviNet - a.resultat.estalviNet)
}
