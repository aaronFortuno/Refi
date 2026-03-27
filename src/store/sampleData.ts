import type { AppState } from '@/types'

export const sampleData: AppState = {
  prestecs: [
    {
      id: 'sample-hipoteca',
      nom: 'Hipoteca habitatge',
      capitalPendent: 125000,
      tin: 3.45,
      tipusInteres: 'variable',
      indexReferencia: 2.45,
      diferencial: 1.0,
      dataProperaRevisio: '2025-11-01',
      projeccionsEuribor: [
        { any: 2025, euribor: 2.45 },
        { any: 2026, euribor: 2.1 },
        { any: 2027, euribor: null },
        { any: 2028, euribor: 1.8 },
      ],
      quotesRestants: 264,
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
            { mesosMinim: 60, valor: 0.25, tipus: 'percentatge' },
          ],
        },
      },
      assegurances: [
        {
          id: 'sample-vida',
          nom: 'Assegurança vida',
          tipus: 'asseguranca',
          costAnual: 280,
          obligatoria: false,
          diferencialSense: 1.3,
        },
        {
          id: 'sample-llar',
          nom: 'Assegurança llar',
          tipus: 'asseguranca',
          costAnual: 190,
          obligatoria: true,
        },
        {
          id: 'sample-nomina',
          nom: 'Nòmina domiciliada',
          tipus: 'bonificacio',
          costAnual: 0,
          obligatoria: false,
          diferencialSense: 1.25,
        },
        {
          id: 'sample-manteniment',
          nom: 'Manteniment compte',
          tipus: 'manteniment',
          costAnual: 48,
          obligatoria: true,
        },
      ],
    },
    {
      id: 'sample-cotxe',
      nom: 'Préstec cotxe',
      capitalPendent: 8500,
      tin: 6.9,
      tipusInteres: 'fix',
      quotesRestants: 48,
      penalitzacio: {
        amortitzacioTotal: {
          brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }],
        },
        amortitzacioParcial: {
          brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }],
        },
      },
      assegurances: [],
    },
  ],
  escenaris: [
    {
      id: 'sample-escenari',
      nom: 'Refinançar cotxe amb préstec personal',
      descripcio: 'Nou préstec a millor tipus per cancel·lar el del cotxe',
      prestecsCancelats: [
        { loanId: 'sample-cotxe', tipus: 'total' },
      ],
      prestecsNous: [
        {
          id: 'sample-nou-prestec',
          nom: 'Préstec personal 4.5%',
          capitalPendent: 8500,
          tin: 4.5,
          tipusInteres: 'fix',
          quotesRestants: 48,
          penalitzacio: {
            amortitzacioTotal: {
              brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }],
            },
            amortitzacioParcial: {
              brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }],
            },
          },
          assegurances: [],
        },
      ],
    },
  ],
}
