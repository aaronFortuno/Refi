import { describe, it, expect } from 'vitest'
import {
  calcularCostActual,
  calcularCostRefinancament,
  calcularResultatEscenari,
} from '@/engine/refinancing'
import type { Loan, Scenario, AppState } from '@/types'

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    nom: 'Hipoteca',
    capitalPendent: 100_000,
    tin: 3,
    tipusInteres: 'fix',
    quotesRestants: 240,
    penalitzacio: {
      amortitzacioTotal: { brackets: [{ mesosMinim: 0, valor: 0.5, tipus: 'percentatge' }] },
      amortitzacioParcial: { brackets: [{ mesosMinim: 0, valor: 0.25, tipus: 'percentatge' }] },
    },
    assegurances: [],
    ...overrides,
  }
}

function makeNewLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'new-loan-1',
    nom: 'Nou préstec',
    capitalPendent: 100_000,
    tin: 2,
    tipusInteres: 'fix',
    quotesRestants: 240,
    penalitzacio: {
      amortitzacioTotal: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
      amortitzacioParcial: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
    },
    assegurances: [],
    comissioObertura: 1,
    comissioOberturaType: 'percentatge',
    ...overrides,
  }
}

describe('calcularCostActual', () => {
  it('calcula el cost total d\'un préstec', () => {
    const loan = makeLoan()
    const result = calcularCostActual([loan])
    expect(result.totalInteressos).toBeGreaterThan(0)
    expect(result.costTotal).toBeGreaterThan(100_000)
    expect(result.detallPrestecs).toHaveLength(1)
  })

  it('suma costos de múltiples préstecs', () => {
    const loan1 = makeLoan({ id: 'l1', capitalPendent: 50_000 })
    const loan2 = makeLoan({ id: 'l2', capitalPendent: 50_000 })
    const single = calcularCostActual([makeLoan({ capitalPendent: 100_000 })])
    const multi = calcularCostActual([loan1, loan2])
    // El cost de 2 préstecs de 50K hauria de ser similar al d'1 de 100K (mateixos termes)
    expect(multi.totalInteressos).toBeCloseTo(single.totalInteressos, -2)
  })

  it('inclou assegurances al cost total', () => {
    const loan = makeLoan({
      assegurances: [{ id: 'ins-1', nom: 'Vida', tipus: 'asseguranca', costAnual: 300, obligatoria: false }],
    })
    const result = calcularCostActual([loan])
    expect(result.totalAssegurances).toBe(300 * 20) // 240 quotes = 20 anys
    expect(result.costTotal).toBe(result.totalQuotes + result.totalAssegurances)
  })
})

describe('calcularCostRefinancament', () => {
  it('calcula penalització per amortització total', () => {
    const loan = makeLoan()
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refinançar',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan()],
    }
    const result = calcularCostRefinancament(scenario, [loan])
    // 0.5% de 100.000 = 500€
    expect(result.totalPenalitzacions).toBe(500)
    expect(result.penalitzacions[0]!.import_).toBe(500)
  })

  it('calcula penalització per amortització parcial', () => {
    const loan = makeLoan()
    const scenario: Scenario = {
      id: 's1',
      nom: 'Parcial',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'parcial', importParcial: 50_000 }],
      prestecsNous: [makeNewLoan({ capitalPendent: 50_000 })],
    }
    const result = calcularCostRefinancament(scenario, [loan])
    // 0.25% de 50.000 = 125€
    expect(result.totalPenalitzacions).toBe(125)
  })

  it('calcula comissions d\'obertura percentual', () => {
    const loan = makeLoan()
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refi',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan({ comissioObertura: 1.5, comissioOberturaType: 'percentatge' })],
    }
    const result = calcularCostRefinancament(scenario, [loan])
    // 1.5% de 100.000 = 1500€
    expect(result.comissionsObertura).toBe(1500)
  })

  it('calcula comissions d\'obertura fixes', () => {
    const loan = makeLoan()
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refi',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan({ comissioObertura: 500, comissioOberturaType: 'fix' })],
    }
    const result = calcularCostRefinancament(scenario, [loan])
    expect(result.comissionsObertura).toBe(500)
  })
})

describe('calcularResultatEscenari', () => {
  it('refinançar a tipus més baix genera estalvi positiu', () => {
    const loan = makeLoan({ tin: 4 })
    const state: AppState = { prestecs: [loan], escenaris: [] }
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refi a 2%',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan({ tin: 2, comissioObertura: 0 })],
    }
    const result = calcularResultatEscenari(scenario, state)
    expect(result.estalviNet).toBeGreaterThan(0)
    expect(result.novaQuotaMensualTotal).toBeLessThan(result.quotaActualTotal)
  })

  it('refinançar a tipus més alt genera estalvi negatiu', () => {
    const loan = makeLoan({ tin: 2 })
    const state: AppState = { prestecs: [loan], escenaris: [] }
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refi a 5%',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan({ tin: 5, comissioObertura: 0 })],
    }
    const result = calcularResultatEscenari(scenario, state)
    expect(result.estalviNet).toBeLessThan(0)
  })

  it('calcula break-even correctament', () => {
    const loan = makeLoan({ tin: 4 })
    const state: AppState = { prestecs: [loan], escenaris: [] }
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refi',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan({ tin: 2 })],
    }
    const result = calcularResultatEscenari(scenario, state)
    expect(result.breakEvenMes).not.toBeNull()
    expect(result.breakEvenMes).toBeGreaterThan(0)
  })

  it('break-even és null si no hi ha estalvi mensual', () => {
    const loan = makeLoan({ tin: 2 })
    const state: AppState = { prestecs: [loan], escenaris: [] }
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refi car',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan({ tin: 5 })],
    }
    const result = calcularResultatEscenari(scenario, state)
    expect(result.breakEvenMes).toBeNull()
  })

  it('break-even és 0 si no hi ha costos inicials', () => {
    const loan = makeLoan({
      tin: 4,
      penalitzacio: {
        amortitzacioTotal: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
        amortitzacioParcial: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
      },
    })
    const state: AppState = { prestecs: [loan], escenaris: [] }
    const scenario: Scenario = {
      id: 's1',
      nom: 'Refi gratis',
      prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
      prestecsNous: [makeNewLoan({ tin: 2, comissioObertura: 0 })],
    }
    const result = calcularResultatEscenari(scenario, state)
    expect(result.breakEvenMes).toBe(0)
  })
})
