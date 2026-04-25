import type { Loan, Insurance } from '@/types'
import { calcularQuotaMensual } from './amortization'

export interface LinkedCostAnalysis {
  insurance: Insurance
  loanNom: string
  costTotalVidaPrestec: number
  extraInteressosSense: number // Cost extra en interessos si s'elimina
  estalviNet: number // Positiu = val la pena mantenir-lo
  recomanacio: 'mantenir' | 'eliminar' | 'obligatori' | 'sense_bonificacio'
}

/**
 * Analitza si un cost vinculat (assegurança, manteniment, bonificació...)
 * surt a compte mantenir-lo o no.
 *
 * Compara:
 * - Cost total del vincle durant la vida del préstec
 * - Cost extra en interessos si s'elimina (per l'augment de diferencial)
 */
export function analitzarCostVinculat(
  loan: Loan,
  insurance: Insurance
): LinkedCostAnalysis {
  const yearsRemaining = Math.ceil(loan.quotesRestants / 12)
  const costTotal = insurance.costAnual * yearsRemaining

  // Si és obligatori, no cal analitzar
  if (insurance.obligatoria) {
    return {
      insurance,
      loanNom: loan.nom,
      costTotalVidaPrestec: costTotal,
      extraInteressosSense: 0,
      estalviNet: 0,
      recomanacio: 'obligatori',
    }
  }

  // Si no té diferencial alternatiu, no hi ha bonificació
  if (insurance.diferencialSense === undefined) {
    return {
      insurance,
      loanNom: loan.nom,
      costTotalVidaPrestec: costTotal,
      extraInteressosSense: 0,
      estalviNet: -costTotal, // Pagar-lo sense benefici
      recomanacio: costTotal > 0 ? 'eliminar' : 'sense_bonificacio',
    }
  }

  // Calcular cost extra en interessos si s'elimina
  const tinAmb = loan.tipusInteres === 'variable'
    ? (loan.indexReferencia ?? 0) + (loan.diferencial ?? 0)
    : loan.tin

  // Sense el vincle: el TIN puja pel valor de la bonificació
  const tinSense = tinAmb + insurance.diferencialSense

  const quotaAmb = calcularQuotaMensual(loan.capitalPendent, tinAmb, loan.quotesRestants)
  const quotaSense = calcularQuotaMensual(loan.capitalPendent, tinSense, loan.quotesRestants)

  const totalAmb = quotaAmb * loan.quotesRestants
  const totalSense = quotaSense * loan.quotesRestants
  const extraInteressos = totalSense - totalAmb

  const estalviNet = extraInteressos - costTotal

  return {
    insurance,
    loanNom: loan.nom,
    costTotalVidaPrestec: costTotal,
    extraInteressosSense: round2(extraInteressos),
    estalviNet: round2(estalviNet),
    recomanacio: estalviNet > 0 ? 'mantenir' : 'eliminar',
  }
}

/**
 * Analitza tots els costos vinculats opcionals de tots els préstecs.
 */
export function analitzarTotsElsCostos(prestecs: Loan[]): LinkedCostAnalysis[] {
  const results: LinkedCostAnalysis[] = []
  for (const loan of prestecs) {
    for (const ins of loan.assegurances) {
      results.push(analitzarCostVinculat(loan, ins))
    }
  }
  return results
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
