export interface ProjectionEntry {
  any: number
  euribor: number | null // null = hereta del període anterior
}

export interface PenaltyBracket {
  mesosMinim: number // Aplica quan queden > mesosMinim quotes (0 = per defecte)
  valor: number      // >= 0
  tipus: 'percentatge' | 'fix' // % sobre capital pendent o import fix en €
}

export interface Penalty {
  brackets: PenaltyBracket[] // Ordenats ascendent per mesosMinim
}

export type LinkedCostType = 'asseguranca' | 'manteniment' | 'bonificacio' | 'altre'

export interface Insurance {
  id: string
  nom: string
  tipus: LinkedCostType
  costAnual: number // €/any (0 per a bonificacions sense cost directe)
  obligatoria: boolean
  diferencialSense?: number // Bonificació: quant redueix el tipus d'interès (%)
}

export interface Loan {
  id: string
  nom: string
  capitalPendent: number // € pendent de pagar
  tin: number // Tipus d'interès nominal anual (%)
  tipusInteres: 'fix' | 'variable'

  // Només si variable:
  indexReferencia?: number // Euríbor actual (%)
  diferencial?: number // Diferencial sobre Euríbor (%)
  dataProperaRevisio?: string // ISO date
  projeccionsEuribor?: ProjectionEntry[]

  quotesRestants: number // Nombre de quotes mensuals pendents

  penalitzacio: {
    amortitzacioTotal: Penalty
    amortitzacioParcial: Penalty
  }

  assegurances: Insurance[]

  // Per a préstecs nous (refinançament):
  comissioObertura?: number
  comissioOberturaType?: 'percentatge' | 'fix'
}

export interface CancelAction {
  loanId: string
  tipus: 'total' | 'parcial'
  importParcial?: number // € si és parcial
  modeAmortitzacio?: 'reduirQuota' | 'reduirTermini' // Només per parcial
}

export interface Scenario {
  id: string
  nom: string
  descripcio?: string
  prestecsCancelats: CancelAction[]
  prestecsNous: Loan[]
}

export interface AppState {
  prestecs: Loan[]
  escenaris: Scenario[]
}

// Resultat d'una fila del quadre d'amortització
export interface AmortizationRow {
  mes: number
  quotaMensual: number
  interessos: number
  amortitzacioCapital: number
  capitalPendent: number
}

export interface AmortizationResult {
  rows: AmortizationRow[]
  totalInteressos: number
  totalPagat: number
  quotaMensual: number
}
