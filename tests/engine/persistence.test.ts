import { describe, it, expect } from 'vitest'
import {
  exportStateAsJson,
  importStateFromJson,
} from '@/store/persistence'
import type { AppState } from '@/types'

const sampleState: AppState = {
  prestecs: [
    {
      id: 'test-1',
      nom: 'Hipoteca',
      capitalPendent: 150_000,
      tin: 2.5,
      tipusInteres: 'variable',
      indexReferencia: 3.5,
      diferencial: 0.8,
      dataProperaRevisio: '2025-06-01',
      projeccionsEuribor: [
        { any: 2025, euribor: 3.5 },
        { any: 2026, euribor: null },
      ],
      quotesRestants: 300,
      penalitzacio: {
        amortitzacioTotal: {
          brackets: [
            { mesosMinim: 0, valor: 0.25, tipus: 'percentatge' },
            { mesosMinim: 60, valor: 0.5, tipus: 'percentatge' },
          ],
        },
        amortitzacioParcial: {
          brackets: [
            { mesosMinim: 0, valor: 0.15, tipus: 'percentatge' },
            { mesosMinim: 12, valor: 0.25, tipus: 'percentatge' },
          ],
        },
      },
      assegurances: [
        {
          id: 'ins-1',
          nom: 'Assegurança vida',
          tipus: 'asseguranca',
          costAnual: 350,
          obligatoria: false,
          diferencialSense: 1.2,
        },
      ],
    },
  ],
  escenaris: [],
}

describe('exportStateAsJson', () => {
  it('exporta JSON vàlid', () => {
    const json = exportStateAsJson(sampleState)
    const parsed = JSON.parse(json)
    expect(parsed.prestecs).toHaveLength(1)
    expect(parsed.prestecs[0].nom).toBe('Hipoteca')
  })

  it('preserva tots els camps', () => {
    const json = exportStateAsJson(sampleState)
    const parsed = JSON.parse(json) as AppState
    const loan = parsed.prestecs[0]!
    expect(loan.capitalPendent).toBe(150_000)
    expect(loan.tipusInteres).toBe('variable')
    expect(loan.assegurances[0]!.diferencialSense).toBe(1.2)
  })
})

describe('importStateFromJson', () => {
  it('importa JSON vàlid', () => {
    const json = exportStateAsJson(sampleState)
    const imported = importStateFromJson(json)
    expect(imported.prestecs).toHaveLength(1)
    expect(imported.prestecs[0]!.nom).toBe('Hipoteca')
  })

  it('rebutja JSON sense prestecs', () => {
    expect(() => importStateFromJson('{"escenaris": []}')).toThrow()
  })

  it('rebutja JSON sense escenaris', () => {
    expect(() => importStateFromJson('{"prestecs": []}')).toThrow()
  })

  it('rebutja JSON invàlid', () => {
    expect(() => importStateFromJson('not json')).toThrow()
  })

  it('round-trip complet: export → import preserva dades', () => {
    const json = exportStateAsJson(sampleState)
    const imported = importStateFromJson(json)
    const reExported = exportStateAsJson(imported)
    expect(reExported).toBe(json)
  })
})
