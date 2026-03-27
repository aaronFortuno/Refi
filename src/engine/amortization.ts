import type { AmortizationResult, AmortizationRow, Loan } from '@/types'
import { getEuriborPerMes } from './projections'

/**
 * Calcula la quota mensual pel mètode francès.
 * C × r / (1 - (1 + r)^(-n))
 */
export function calcularQuotaMensual(
  capital: number,
  tinAnual: number,
  quotesRestants: number
): number {
  if (quotesRestants <= 0) return 0
  if (tinAnual === 0) return capital / quotesRestants

  const r = tinAnual / 100 / 12
  return (capital * r) / (1 - Math.pow(1 + r, -quotesRestants))
}

/**
 * Genera el quadre d'amortització complet pel mètode francès (préstec fix).
 */
export function generarQuadreAmortitzacio(
  capital: number,
  tinAnual: number,
  quotesRestants: number
): AmortizationResult {
  const quota = calcularQuotaMensual(capital, tinAnual, quotesRestants)
  const r = tinAnual / 100 / 12
  const rows: AmortizationRow[] = []

  let capitalPendent = capital
  let totalInteressos = 0

  for (let mes = 1; mes <= quotesRestants; mes++) {
    const interessos = capitalPendent * r
    let amortitzacioCapital = quota - interessos

    // Última quota: ajustar per arrodoniments
    if (mes === quotesRestants) {
      amortitzacioCapital = capitalPendent
    }

    capitalPendent = Math.max(0, capitalPendent - amortitzacioCapital)
    totalInteressos += interessos

    rows.push({
      mes,
      quotaMensual: round2(mes === quotesRestants ? interessos + amortitzacioCapital : quota),
      interessos: round2(interessos),
      amortitzacioCapital: round2(amortitzacioCapital),
      capitalPendent: round2(capitalPendent),
    })
  }

  return {
    rows,
    totalInteressos: round2(totalInteressos),
    totalPagat: round2(totalInteressos + capital),
    quotaMensual: round2(quota),
  }
}

/**
 * Calcula l'efecte d'una amortització parcial.
 * Retorna dos escenaris: reduir quota o reduir termini.
 */
export function simularAmortitzacioParcial(
  capitalActual: number,
  tinAnual: number,
  quotesRestants: number,
  importAmortitzat: number
): { reduirQuota: AmortizationResult; reduirTermini: AmortizationResult } {
  const nouCapital = capitalActual - importAmortitzat

  // Opció 1: Reduir quota, mantenir termini
  const reduirQuota = generarQuadreAmortitzacio(nouCapital, tinAnual, quotesRestants)

  // Opció 2: Reduir termini, mantenir quota similar
  const quotaActual = calcularQuotaMensual(capitalActual, tinAnual, quotesRestants)
  const novesQuotes = calcularQuotesPerQuotaObjectiu(nouCapital, tinAnual, quotaActual)
  const reduirTermini = generarQuadreAmortitzacio(nouCapital, tinAnual, novesQuotes)

  return { reduirQuota, reduirTermini }
}

/**
 * Calcula quantes quotes calen per pagar un capital amb una quota objectiu donada.
 * n = -ln(1 - C*r/Q) / ln(1+r)
 */
function calcularQuotesPerQuotaObjectiu(
  capital: number,
  tinAnual: number,
  quotaObjectiu: number
): number {
  if (tinAnual === 0) return Math.ceil(capital / quotaObjectiu)

  const r = tinAnual / 100 / 12
  const n = -Math.log(1 - (capital * r) / quotaObjectiu) / Math.log(1 + r)
  return Math.ceil(n)
}

/**
 * Genera el quadre d'amortització per a un préstec variable.
 * El TIN canvia en cada revisió anual segons les projeccions d'Euríbor.
 * Recalcula la quota cada cop que canvia el tipus.
 */
export function generarQuadreVariable(loan: Loan): AmortizationResult {
  if (loan.tipusInteres !== 'variable') {
    return generarQuadreAmortitzacio(loan.capitalPendent, loan.tin, loan.quotesRestants)
  }

  const dataInici = new Date()
  const rows: AmortizationRow[] = []
  let capitalPendent = loan.capitalPendent
  let totalInteressos = 0
  let quotaActual = 0
  let tinActual = -1 // Forçar recàlcul al primer mes

  for (let mes = 1; mes <= loan.quotesRestants; mes++) {
    const quotesRestantsMes = loan.quotesRestants - mes + 1
    const tinMes = getEuriborPerMes(
      mes,
      loan.indexReferencia ?? 0,
      loan.diferencial ?? 0,
      loan.dataProperaRevisio,
      loan.projeccionsEuribor ?? [],
      dataInici
    )

    // Recalcular quota si el TIN ha canviat
    if (tinMes !== tinActual) {
      tinActual = tinMes
      quotaActual = calcularQuotaMensual(capitalPendent, tinActual, quotesRestantsMes)
    }

    const r = tinActual / 100 / 12
    const interessos = capitalPendent * r
    let amortitzacioCapital = quotaActual - interessos

    // Última quota: ajustar per arrodoniments
    if (mes === loan.quotesRestants) {
      amortitzacioCapital = capitalPendent
    }

    capitalPendent = Math.max(0, capitalPendent - amortitzacioCapital)
    totalInteressos += interessos

    rows.push({
      mes,
      quotaMensual: round2(mes === loan.quotesRestants ? interessos + amortitzacioCapital : quotaActual),
      interessos: round2(interessos),
      amortitzacioCapital: round2(amortitzacioCapital),
      capitalPendent: round2(capitalPendent),
    })
  }

  return {
    rows,
    totalInteressos: round2(totalInteressos),
    totalPagat: round2(totalInteressos + loan.capitalPendent),
    quotaMensual: round2(quotaActual), // Última quota calculada
  }
}

/**
 * Funció unificada: genera el quadre per a qualsevol préstec (fix o variable).
 */
export function generarQuadrePrestec(loan: Loan): AmortizationResult {
  if (loan.tipusInteres === 'variable') {
    return generarQuadreVariable(loan)
  }
  return generarQuadreAmortitzacio(loan.capitalPendent, loan.tin, loan.quotesRestants)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
