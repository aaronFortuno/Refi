import type { Loan, Scenario, AppState } from '@/types'
import { generarQuadrePrestec, generarQuadreAmortitzacio, calcularQuotaMensual } from './amortization'
import { calcularPenalitzacio } from './penalty'

export interface CostSituacioActual {
  totalQuotes: number
  totalInteressos: number
  totalAssegurances: number
  costTotal: number
  detallPrestecs: LoanCostDetail[]
}

export interface LoanCostDetail {
  loanId: string
  nom: string
  quotaMensual: number
  quotesRestants: number
  totalQuotes: number
  totalInteressos: number
  totalAssegurances: number
}

export interface CostRefinancament {
  penalitzacions: PenaltyDetail[]
  totalPenalitzacions: number
  comissionsObertura: number
  totalQuotesNous: number
  totalInteressosNous: number
  totalAssegurancesNoves: number
  costTotal: number
  detallPrestecsNous: LoanCostDetail[]
  // Préstecs que queden vius (parcialment amortitzats)
  detallPrestecsRestants: LoanCostDetail[]
  totalQuotesRestants: number
  totalInteressosRestants: number
}

export interface PenaltyDetail {
  loanId: string
  nom: string
  tipus: 'total' | 'parcial'
  import_: number
}

export interface ResultatEscenari {
  costActual: CostSituacioActual
  costRefinancament: CostRefinancament
  estalviNet: number
  breakEvenMes: number | null
  novaQuotaMensualTotal: number // Inclou préstecs nous + restants
  quotaActualTotal: number
}

/**
 * Calcula el cost total de la situació actual (sense refinançar).
 */
export function calcularCostActual(prestecs: Loan[]): CostSituacioActual {
  const detall: LoanCostDetail[] = []
  let totalQuotes = 0
  let totalInteressos = 0
  let totalAssegurances = 0

  for (const loan of prestecs) {
    const result = generarQuadrePrestec(loan)
    const yearsRemaining = Math.ceil(loan.quotesRestants / 12)
    const assegurances = loan.assegurances.reduce(
      (sum, ins) => sum + ins.costAnual * yearsRemaining,
      0
    )

    detall.push({
      loanId: loan.id,
      nom: loan.nom,
      quotaMensual: result.quotaMensual,
      quotesRestants: loan.quotesRestants,
      totalQuotes: result.totalPagat,
      totalInteressos: result.totalInteressos,
      totalAssegurances: assegurances,
    })

    totalQuotes += result.totalPagat
    totalInteressos += result.totalInteressos
    totalAssegurances += assegurances
  }

  return {
    totalQuotes,
    totalInteressos,
    totalAssegurances,
    costTotal: totalQuotes + totalAssegurances,
    detallPrestecs: detall,
  }
}

/**
 * Calcula el cost d'un escenari de refinançament, incloent els préstecs
 * que queden vius després d'una amortització parcial.
 */
export function calcularCostRefinancament(
  scenario: Scenario,
  prestecsActuals: Loan[]
): CostRefinancament {
  // 1. Penalitzacions per cancel·lació
  const penalitzacions: PenaltyDetail[] = []
  let totalPenalitzacions = 0

  for (const cancel of scenario.prestecsCancelats) {
    const loan = prestecsActuals.find((l) => l.id === cancel.loanId)
    if (!loan) continue

    const penaltyConfig =
      cancel.tipus === 'total'
        ? loan.penalitzacio.amortitzacioTotal
        : loan.penalitzacio.amortitzacioParcial

    const capitalAfectat =
      cancel.tipus === 'total' ? loan.capitalPendent : (cancel.importParcial ?? 0)

    const penalitat = calcularPenalitzacio(penaltyConfig, capitalAfectat, loan.quotesRestants)

    penalitzacions.push({
      loanId: loan.id,
      nom: loan.nom,
      tipus: cancel.tipus,
      import_: penalitat,
    })
    totalPenalitzacions += penalitat
  }

  // 2. Comissions d'obertura dels nous préstecs
  let comissionsObertura = 0
  for (const nou of scenario.prestecsNous) {
    if (nou.comissioObertura) {
      comissionsObertura +=
        nou.comissioOberturaType === 'percentatge'
          ? (nou.capitalPendent * nou.comissioObertura) / 100
          : nou.comissioObertura
    }
  }

  // 3. Cost dels nous préstecs
  const detallNous: LoanCostDetail[] = []
  let totalQuotesNous = 0
  let totalInteressosNous = 0
  let totalAssegurancesNoves = 0

  for (const nou of scenario.prestecsNous) {
    const result = generarQuadrePrestec(nou)
    const yearsRemaining = Math.ceil(nou.quotesRestants / 12)
    const assegurances = nou.assegurances.reduce(
      (sum, ins) => sum + ins.costAnual * yearsRemaining,
      0
    )

    detallNous.push({
      loanId: nou.id,
      nom: nou.nom,
      quotaMensual: result.quotaMensual,
      quotesRestants: nou.quotesRestants,
      totalQuotes: result.totalPagat,
      totalInteressos: result.totalInteressos,
      totalAssegurances: assegurances,
    })

    totalQuotesNous += result.totalPagat
    totalInteressosNous += result.totalInteressos
    totalAssegurancesNoves += assegurances
  }

  // 4. Cost dels préstecs que queden vius (amortització parcial)
  const detallRestants: LoanCostDetail[] = []
  let totalQuotesRestants = 0
  let totalInteressosRestants = 0

  for (const cancel of scenario.prestecsCancelats) {
    if (cancel.tipus !== 'parcial') continue
    const loan = prestecsActuals.find((l) => l.id === cancel.loanId)
    if (!loan) continue

    const nouCapital = loan.capitalPendent - (cancel.importParcial ?? 0)
    if (nouCapital <= 0) continue

    const mode = cancel.modeAmortitzacio ?? 'reduirQuota'
    let quotesRestantsNoves = loan.quotesRestants

    if (mode === 'reduirTermini') {
      // Mantenir la quota actual, reduir el nombre de quotes
      const quotaActual = calcularQuotaMensual(loan.capitalPendent, loan.tin, loan.quotesRestants)
      quotesRestantsNoves = calcularQuotesPerQuota(nouCapital, loan.tin, quotaActual)
    }

    const resultRestant = loan.tipusInteres === 'variable'
      ? generarQuadrePrestec({ ...loan, capitalPendent: nouCapital, quotesRestants: quotesRestantsNoves })
      : generarQuadreAmortitzacio(nouCapital, loan.tin, quotesRestantsNoves)

    const yearsRemaining = Math.ceil(quotesRestantsNoves / 12)
    const assegurances = loan.assegurances.reduce(
      (sum, ins) => sum + ins.costAnual * yearsRemaining,
      0
    )

    detallRestants.push({
      loanId: loan.id,
      nom: `${loan.nom} (restant)`,
      quotaMensual: resultRestant.quotaMensual,
      quotesRestants: quotesRestantsNoves,
      totalQuotes: resultRestant.totalPagat,
      totalInteressos: resultRestant.totalInteressos,
      totalAssegurances: assegurances,
    })

    totalQuotesRestants += resultRestant.totalPagat
    totalInteressosRestants += resultRestant.totalInteressos
  }

  const costTotal =
    totalPenalitzacions +
    comissionsObertura +
    totalQuotesNous +
    totalAssegurancesNoves +
    totalQuotesRestants

  return {
    penalitzacions,
    totalPenalitzacions,
    comissionsObertura,
    totalQuotesNous,
    totalInteressosNous,
    totalAssegurancesNoves,
    costTotal,
    detallPrestecsNous: detallNous,
    detallPrestecsRestants: detallRestants,
    totalQuotesRestants,
    totalInteressosRestants,
  }
}

/**
 * Calcula el resultat complet d'un escenari.
 */
export function calcularResultatEscenari(
  scenario: Scenario,
  state: AppState
): ResultatEscenari {
  const prestecsAfectats = state.prestecs.filter((l) =>
    scenario.prestecsCancelats.some((c) => c.loanId === l.id)
  )

  const costActual = calcularCostActual(prestecsAfectats)
  const costRefi = calcularCostRefinancament(scenario, state.prestecs)

  const estalviNet = costActual.costTotal - costRefi.costTotal

  // Nova quota = nous préstecs + préstecs restants (parcialment amortitzats)
  const quotaActualTotal = costActual.detallPrestecs.reduce(
    (sum, d) => sum + d.quotaMensual,
    0
  )
  const quotaNousTotal = costRefi.detallPrestecsNous.reduce(
    (sum, d) => sum + d.quotaMensual,
    0
  )
  const quotaRestantsTotal = costRefi.detallPrestecsRestants.reduce(
    (sum, d) => sum + d.quotaMensual,
    0
  )
  const novaQuotaTotal = quotaNousTotal + quotaRestantsTotal

  // Break-even
  const costosInicials = costRefi.totalPenalitzacions + costRefi.comissionsObertura
  const estalviMensual = quotaActualTotal - novaQuotaTotal

  let breakEvenMes: number | null = null
  if (estalviMensual > 0 && costosInicials > 0) {
    breakEvenMes = Math.ceil(costosInicials / estalviMensual)
  } else if (costosInicials === 0 && estalviMensual > 0) {
    breakEvenMes = 0
  }

  return {
    costActual,
    costRefinancament: costRefi,
    estalviNet,
    breakEvenMes,
    novaQuotaMensualTotal: novaQuotaTotal,
    quotaActualTotal,
  }
}

/**
 * Calcula quantes quotes calen per pagar un capital mantenint una quota objectiu.
 * n = -ln(1 - C*r/Q) / ln(1+r)
 */
function calcularQuotesPerQuota(
  capital: number,
  tinAnual: number,
  quotaObjectiu: number
): number {
  if (tinAnual === 0) return Math.ceil(capital / quotaObjectiu)
  const r = tinAnual / 100 / 12
  const ratio = (capital * r) / quotaObjectiu
  if (ratio >= 1) return Infinity // La quota no cobreix els interessos
  const n = -Math.log(1 - ratio) / Math.log(1 + r)
  return Math.max(1, Math.ceil(n))
}
