import { describe, it, expect } from 'vitest'
import { compararEscenaris } from '@/engine/comparator'
import type { Loan, Scenario, AppState } from '@/types'

function makeLoan(): Loan {
  return {
    id: 'loan-1',
    nom: 'Hipoteca',
    capitalPendent: 100_000,
    tin: 4,
    tipusInteres: 'fix',
    quotesRestants: 240,
    penalitzacio: {
      amortitzacioTotal: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
      amortitzacioParcial: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
    },
    assegurances: [],
  }
}

function makeScenario(id: string, nom: string, tin: number): Scenario {
  return {
    id,
    nom,
    prestecsCancelats: [{ loanId: 'loan-1', tipus: 'total' }],
    prestecsNous: [
      {
        id: `new-${id}`,
        nom: `Nou ${nom}`,
        capitalPendent: 100_000,
        tin,
        tipusInteres: 'fix',
        quotesRestants: 240,
        penalitzacio: {
          amortitzacioTotal: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
          amortitzacioParcial: { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] },
        },
        assegurances: [],
      },
    ],
  }
}

describe('compararEscenaris', () => {
  it('ordena escenaris per estalvi net descendent', () => {
    const state: AppState = {
      prestecs: [makeLoan()],
      escenaris: [],
    }
    const escenaris = [
      makeScenario('s1', 'Refi 3%', 3),
      makeScenario('s2', 'Refi 1%', 1),
      makeScenario('s3', 'Refi 2%', 2),
    ]
    const result = compararEscenaris(escenaris, state)
    expect(result).toHaveLength(3)
    // 1% hauria de tenir més estalvi que 2%, que més que 3%
    expect(result[0]!.nom).toBe('Refi 1%')
    expect(result[1]!.nom).toBe('Refi 2%')
    expect(result[2]!.nom).toBe('Refi 3%')
  })

  it('tots els escenaris tenen estalvi positiu respecte a 4%', () => {
    const state: AppState = {
      prestecs: [makeLoan()],
      escenaris: [],
    }
    const escenaris = [
      makeScenario('s1', 'Refi 2%', 2),
      makeScenario('s2', 'Refi 3%', 3),
    ]
    const result = compararEscenaris(escenaris, state)
    for (const r of result) {
      expect(r.resultat.estalviNet).toBeGreaterThan(0)
    }
  })

  it('retorna llista buida si no hi ha escenaris', () => {
    const state: AppState = { prestecs: [makeLoan()], escenaris: [] }
    expect(compararEscenaris([], state)).toHaveLength(0)
  })
})
