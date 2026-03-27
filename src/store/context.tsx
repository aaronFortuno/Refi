import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { AppState, Loan, Scenario } from '@/types'
import { loadState, saveState } from './persistence'

const MAX_LOANS = 6

type Action =
  | { type: 'ADD_LOAN'; loan: Loan }
  | { type: 'UPDATE_LOAN'; loan: Loan }
  | { type: 'DELETE_LOAN'; loanId: string }
  | { type: 'ADD_SCENARIO'; scenario: Scenario }
  | { type: 'UPDATE_SCENARIO'; scenario: Scenario }
  | { type: 'DELETE_SCENARIO'; scenarioId: string }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'CLEAR_ALL' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_LOAN': {
      if (state.prestecs.length >= MAX_LOANS) return state
      return { ...state, prestecs: [...state.prestecs, action.loan] }
    }
    case 'UPDATE_LOAN':
      return {
        ...state,
        prestecs: state.prestecs.map((l) => (l.id === action.loan.id ? action.loan : l)),
      }
    case 'DELETE_LOAN':
      return {
        ...state,
        prestecs: state.prestecs.filter((l) => l.id !== action.loanId),
      }
    case 'ADD_SCENARIO':
      return { ...state, escenaris: [...state.escenaris, action.scenario] }
    case 'UPDATE_SCENARIO':
      return {
        ...state,
        escenaris: state.escenaris.map((s) =>
          s.id === action.scenario.id ? action.scenario : s
        ),
      }
    case 'DELETE_SCENARIO':
      return {
        ...state,
        escenaris: state.escenaris.filter((s) => s.id !== action.scenarioId),
      }
    case 'IMPORT_STATE':
      return action.state
    case 'CLEAR_ALL':
      return { prestecs: [], escenaris: [] }
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useAppState(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
