import { describe, it, expect } from 'vitest'
import {
  calcularQuotaMensual,
  generarQuadreAmortitzacio,
  generarQuadrePrestec,
  simularAmortitzacioParcial,
} from '@/engine/amortization'
import type { Loan } from '@/types'

describe('calcularQuotaMensual', () => {
  it('calcula correctament la quota per un préstec típic', () => {
    // 100.000€, 3% TIN, 240 mesos (20 anys)
    const quota = calcularQuotaMensual(100_000, 3, 240)
    // Valor esperat: ~554.60€
    expect(quota).toBeCloseTo(554.60, 0)
  })

  it('retorna 0 si no hi ha quotes', () => {
    expect(calcularQuotaMensual(100_000, 3, 0)).toBe(0)
  })

  it('gestiona TIN 0% (sense interessos)', () => {
    const quota = calcularQuotaMensual(12_000, 0, 12)
    expect(quota).toBe(1000)
  })

  it('calcula correctament per a imports petits', () => {
    const quota = calcularQuotaMensual(5_000, 5, 60)
    // ~94.36€
    expect(quota).toBeCloseTo(94.36, 0)
  })

  it('calcula correctament per a tipus alts', () => {
    const quota = calcularQuotaMensual(50_000, 10, 120)
    // ~660.75€
    expect(quota).toBeCloseTo(660.75, 0)
  })
})

describe('generarQuadreAmortitzacio', () => {
  it('genera el nombre correcte de files', () => {
    const result = generarQuadreAmortitzacio(100_000, 3, 240)
    expect(result.rows).toHaveLength(240)
  })

  it('el capital pendent final és 0', () => {
    const result = generarQuadreAmortitzacio(100_000, 3, 240)
    const lastRow = result.rows[result.rows.length - 1]!
    expect(lastRow.capitalPendent).toBe(0)
  })

  it('la suma d\'amortitzacions de capital és igual al capital inicial', () => {
    const capital = 100_000
    const result = generarQuadreAmortitzacio(capital, 3, 240)
    const totalAmortitzat = result.rows.reduce((sum, r) => sum + r.amortitzacioCapital, 0)
    expect(totalAmortitzat).toBeCloseTo(capital, 0)
  })

  it('totalPagat = capital + totalInteressos', () => {
    const capital = 100_000
    const result = generarQuadreAmortitzacio(capital, 3, 240)
    expect(result.totalPagat).toBeCloseTo(capital + result.totalInteressos, 0)
  })

  it('els interessos decreixen al llarg del temps', () => {
    const result = generarQuadreAmortitzacio(100_000, 3, 240)
    const firstInterest = result.rows[0]!.interessos
    const lastInterest = result.rows[result.rows.length - 2]!.interessos // penúltim per evitar ajust
    expect(firstInterest).toBeGreaterThan(lastInterest)
  })

  it('l\'amortització de capital creix al llarg del temps', () => {
    const result = generarQuadreAmortitzacio(100_000, 3, 240)
    const firstPrincipal = result.rows[0]!.amortitzacioCapital
    const midPrincipal = result.rows[119]!.amortitzacioCapital
    expect(midPrincipal).toBeGreaterThan(firstPrincipal)
  })

  it('gestiona TIN 0% correctament', () => {
    const result = generarQuadreAmortitzacio(12_000, 0, 12)
    expect(result.quotaMensual).toBe(1000)
    expect(result.totalInteressos).toBe(0)
    expect(result.totalPagat).toBe(12_000)
    result.rows.forEach((row) => {
      expect(row.interessos).toBe(0)
    })
  })

  it('interessos totals realistes per un cas conegut', () => {
    // 150.000€, 2.5% TIN, 360 mesos (30 anys)
    const result = generarQuadreAmortitzacio(150_000, 2.5, 360)
    // Total interessos esperat: ~63.300€ aprox
    expect(result.totalInteressos).toBeGreaterThan(60_000)
    expect(result.totalInteressos).toBeLessThan(70_000)
  })
})

describe('simularAmortitzacioParcial', () => {
  it('reduir quota manté el nombre de quotes', () => {
    const { reduirQuota } = simularAmortitzacioParcial(100_000, 3, 240, 20_000)
    expect(reduirQuota.rows).toHaveLength(240)
  })

  it('reduir quota resulta en quota menor', () => {
    const quotaOriginal = calcularQuotaMensual(100_000, 3, 240)
    const { reduirQuota } = simularAmortitzacioParcial(100_000, 3, 240, 20_000)
    expect(reduirQuota.quotaMensual).toBeLessThan(quotaOriginal)
  })

  it('reduir termini resulta en menys quotes', () => {
    const { reduirTermini } = simularAmortitzacioParcial(100_000, 3, 240, 20_000)
    expect(reduirTermini.rows.length).toBeLessThan(240)
  })

  it('reduir termini estalvia més interessos que reduir quota', () => {
    const { reduirQuota, reduirTermini } = simularAmortitzacioParcial(100_000, 3, 240, 20_000)
    expect(reduirTermini.totalInteressos).toBeLessThan(reduirQuota.totalInteressos)
  })

  it('ambdós escenaris tenen capital pendent final 0', () => {
    const { reduirQuota, reduirTermini } = simularAmortitzacioParcial(100_000, 3, 240, 20_000)
    expect(reduirQuota.rows[reduirQuota.rows.length - 1]!.capitalPendent).toBe(0)
    expect(reduirTermini.rows[reduirTermini.rows.length - 1]!.capitalPendent).toBe(0)
  })

  it('reduir termini manté la quota original exacta a totes les mensualitats menys l\'última', () => {
    const quotaOriginal = round2(calcularQuotaMensual(100_000, 3, 240))
    const { reduirTermini } = simularAmortitzacioParcial(100_000, 3, 240, 20_000)
    const totes = reduirTermini.rows
    // Totes les mensualitats menys l'última han de ser idèntiques a la quota original
    for (let i = 0; i < totes.length - 1; i++) {
      expect(totes[i]!.quotaMensual).toBe(quotaOriginal)
    }
    // L'última ha de ser <= quota original (romanent)
    expect(totes[totes.length - 1]!.quotaMensual).toBeLessThanOrEqual(quotaOriginal)
  })
})

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

describe('generarQuadrePrestec (variable)', () => {
  function makeLoanVariable(overrides: Partial<Loan> = {}): Loan {
    return {
      id: 'test-var',
      nom: 'Hipoteca variable',
      capitalPendent: 150_000,
      tin: 4.3, // Es recalcularà
      tipusInteres: 'variable',
      indexReferencia: 3.5,
      diferencial: 0.8,
      dataProperaRevisio: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 6 mesos
      projeccionsEuribor: [],
      quotesRestants: 240,
      penalitzacio: {
        amortitzacioTotal: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
        amortitzacioParcial: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
      },
      assegurances: [],
      ...overrides,
    }
  }

  it('genera el nombre correcte de files per a variable', () => {
    const loan = makeLoanVariable()
    const result = generarQuadrePrestec(loan)
    expect(result.rows).toHaveLength(240)
  })

  it('el capital pendent final és 0', () => {
    const loan = makeLoanVariable()
    const result = generarQuadrePrestec(loan)
    const lastRow = result.rows[result.rows.length - 1]!
    expect(lastRow.capitalPendent).toBe(0)
  })

  it('la suma d\'amortitzacions és igual al capital', () => {
    const loan = makeLoanVariable()
    const result = generarQuadrePrestec(loan)
    const totalAmortitzat = result.rows.reduce((sum, r) => sum + r.amortitzacioCapital, 0)
    expect(totalAmortitzat).toBeCloseTo(150_000, 0)
  })

  it('totalPagat = capital + totalInteressos', () => {
    const loan = makeLoanVariable()
    const result = generarQuadrePrestec(loan)
    expect(result.totalPagat).toBeCloseTo(loan.capitalPendent + result.totalInteressos, 0)
  })

  it('delega a fix si tipusInteres és fix', () => {
    const loan = makeLoanVariable({ tipusInteres: 'fix', tin: 3 })
    const resultPrestec = generarQuadrePrestec(loan)
    const resultFix = generarQuadreAmortitzacio(loan.capitalPendent, 3, loan.quotesRestants)
    expect(resultPrestec.totalInteressos).toBe(resultFix.totalInteressos)
  })
})
