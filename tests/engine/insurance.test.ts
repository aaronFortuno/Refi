import { describe, it, expect } from 'vitest'
import { analitzarCostVinculat, analitzarTotsElsCostos } from '@/engine/insurance'
import type { Loan, Insurance } from '@/types'

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    nom: 'Hipoteca',
    capitalPendent: 100_000,
    tin: 3,
    tipusInteres: 'variable',
    indexReferencia: 2,
    diferencial: 1,
    quotesRestants: 240,
    penalitzacio: {
      amortitzacioTotal: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
      amortitzacioParcial: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
    },
    assegurances: [],
    ...overrides,
  }
}

describe('analitzarCostVinculat', () => {
  it('assegurança obligatòria retorna recomanació obligatori', () => {
    const ins: Insurance = {
      id: 'ins-1', nom: 'Vida', tipus: 'asseguranca',
      costAnual: 300, obligatoria: true,
    }
    const result = analitzarCostVinculat(makeLoan(), ins)
    expect(result.recomanacio).toBe('obligatori')
    expect(result.costTotalVidaPrestec).toBe(300 * 20)
  })

  it('cost sense bonificació recomana eliminar', () => {
    const ins: Insurance = {
      id: 'ins-1', nom: 'Manteniment', tipus: 'manteniment',
      costAnual: 60, obligatoria: false,
      // Sense diferencialSense
    }
    const result = analitzarCostVinculat(makeLoan(), ins)
    expect(result.recomanacio).toBe('eliminar')
    expect(result.estalviNet).toBe(-60 * 20)
  })

  it('assegurança que estalvia més que costa recomana mantenir', () => {
    const ins: Insurance = {
      id: 'ins-1', nom: 'Vida', tipus: 'asseguranca',
      costAnual: 100, obligatoria: false,
      diferencialSense: 0.5, // Bonifica 0.5% sobre el diferencial
    }
    const result = analitzarCostVinculat(makeLoan(), ins)
    expect(result.recomanacio).toBe('mantenir')
    expect(result.estalviNet).toBeGreaterThan(0)
    expect(result.extraInteressosSense).toBeGreaterThan(0)
  })

  it('assegurança cara amb poca bonificació recomana eliminar', () => {
    const ins: Insurance = {
      id: 'ins-1', nom: 'Llar', tipus: 'asseguranca',
      costAnual: 500, obligatoria: false,
      diferencialSense: 0.02, // Bonifica només 0.02%
    }
    const result = analitzarCostVinculat(makeLoan(), ins)
    expect(result.recomanacio).toBe('eliminar')
    expect(result.estalviNet).toBeLessThan(0)
  })

  it('bonificació nòmina sense cost directe recomana mantenir', () => {
    const ins: Insurance = {
      id: 'ins-1', nom: 'Nòmina domiciliada', tipus: 'bonificacio',
      costAnual: 0, obligatoria: false,
      diferencialSense: 0.3, // Bonifica 0.3% per nòmina domiciliada
    }
    const result = analitzarCostVinculat(makeLoan(), ins)
    expect(result.recomanacio).toBe('mantenir')
    expect(result.costTotalVidaPrestec).toBe(0)
    expect(result.extraInteressosSense).toBeGreaterThan(0)
  })

  it('manteniment obligatori calcula cost total correctament', () => {
    const ins: Insurance = {
      id: 'ins-1', nom: 'Manteniment', tipus: 'manteniment',
      costAnual: 48, obligatoria: true,
    }
    const loan = makeLoan({ quotesRestants: 120 }) // 10 anys
    const result = analitzarCostVinculat(loan, ins)
    expect(result.costTotalVidaPrestec).toBe(48 * 10)
    expect(result.recomanacio).toBe('obligatori')
  })
})

describe('analitzarTotsElsCostos', () => {
  it('retorna anàlisi per tots els costos de tots els préstecs', () => {
    const loan = makeLoan({
      assegurances: [
        { id: 'a', nom: 'Vida', tipus: 'asseguranca', costAnual: 200, obligatoria: false, diferencialSense: 0.5 },
        { id: 'b', nom: 'Manteniment', tipus: 'manteniment', costAnual: 48, obligatoria: true },
      ],
    })
    const results = analitzarTotsElsCostos([loan])
    expect(results).toHaveLength(2)
  })

  it('retorna llista buida si no hi ha costos', () => {
    const loan = makeLoan()
    expect(analitzarTotsElsCostos([loan])).toHaveLength(0)
  })
})
