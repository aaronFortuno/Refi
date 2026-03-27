import { describe, it, expect } from 'vitest'
import { resolveApplicableBracket, calcularPenalitzacio } from '@/engine/penalty'
import type { Penalty } from '@/types'

describe('resolveApplicableBracket', () => {
  const penaltyTwoTiers: Penalty = {
    brackets: [
      { mesosMinim: 0, valor: 0.25, tipus: 'percentatge' },
      { mesosMinim: 60, valor: 0.5, tipus: 'percentatge' },
    ],
  }

  it('retorna el tram per defecte si queden poques quotes', () => {
    const bracket = resolveApplicableBracket(penaltyTwoTiers, 30)
    expect(bracket.valor).toBe(0.25)
  })

  it('retorna el tram superior si queden moltes quotes', () => {
    const bracket = resolveApplicableBracket(penaltyTwoTiers, 120)
    expect(bracket.valor).toBe(0.5)
  })

  it('retorna el tram per defecte quan queden exactament el llindar', () => {
    // 60 quotes restants, el tram diu "més de 60", per tant no aplica
    const bracket = resolveApplicableBracket(penaltyTwoTiers, 60)
    expect(bracket.valor).toBe(0.25)
  })

  it('retorna el tram superior quan queden 61 (just per sobre)', () => {
    const bracket = resolveApplicableBracket(penaltyTwoTiers, 61)
    expect(bracket.valor).toBe(0.5)
  })

  it('gestiona un sol tram (sense trams addicionals)', () => {
    const singleTier: Penalty = {
      brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }],
    }
    const bracket = resolveApplicableBracket(singleTier, 200)
    expect(bracket.valor).toBe(0)
  })

  it('gestiona tres trams correctament', () => {
    const threeTiers: Penalty = {
      brackets: [
        { mesosMinim: 0, valor: 0.1, tipus: 'percentatge' },
        { mesosMinim: 12, valor: 0.25, tipus: 'percentatge' },
        { mesosMinim: 60, valor: 0.5, tipus: 'percentatge' },
      ],
    }
    expect(resolveApplicableBracket(threeTiers, 6).valor).toBe(0.1)
    expect(resolveApplicableBracket(threeTiers, 12).valor).toBe(0.1)
    expect(resolveApplicableBracket(threeTiers, 13).valor).toBe(0.25)
    expect(resolveApplicableBracket(threeTiers, 60).valor).toBe(0.25)
    expect(resolveApplicableBracket(threeTiers, 61).valor).toBe(0.5)
  })
})

describe('calcularPenalitzacio', () => {
  it('calcula penalització percentual correctament', () => {
    const penalty: Penalty = {
      brackets: [{ mesosMinim: 0, valor: 0.5, tipus: 'percentatge' }],
    }
    // 0.5% de 100.000€ = 500€
    expect(calcularPenalitzacio(penalty, 100_000, 120)).toBe(500)
  })

  it('calcula penalització fixa correctament', () => {
    const penalty: Penalty = {
      brackets: [{ mesosMinim: 0, valor: 300, tipus: 'fix' }],
    }
    expect(calcularPenalitzacio(penalty, 100_000, 120)).toBe(300)
  })

  it('aplica el tram correcte segons quotes restants', () => {
    const penalty: Penalty = {
      brackets: [
        { mesosMinim: 0, valor: 0.25, tipus: 'percentatge' },
        { mesosMinim: 60, valor: 0.5, tipus: 'percentatge' },
      ],
    }
    // 30 quotes → 0.25% de 100.000 = 250
    expect(calcularPenalitzacio(penalty, 100_000, 30)).toBe(250)
    // 120 quotes → 0.5% de 100.000 = 500
    expect(calcularPenalitzacio(penalty, 100_000, 120)).toBe(500)
  })

  it('retorna 0 si el valor és 0', () => {
    const penalty: Penalty = {
      brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }],
    }
    expect(calcularPenalitzacio(penalty, 100_000, 120)).toBe(0)
  })

  it('arrodoneix a 2 decimals', () => {
    const penalty: Penalty = {
      brackets: [{ mesosMinim: 0, valor: 0.33, tipus: 'percentatge' }],
    }
    // 0.33% de 100.000 = 330.00
    expect(calcularPenalitzacio(penalty, 100_000, 120)).toBe(330)
    // 0.33% de 12.345 = 40.7385 → 40.74
    expect(calcularPenalitzacio(penalty, 12_345, 120)).toBe(40.74)
  })
})
