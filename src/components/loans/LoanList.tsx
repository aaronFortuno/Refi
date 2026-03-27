import { useState } from 'react'
import { useAppState } from '@/store/context'
import { LoanForm } from './LoanForm'
import { LoanSummary } from './LoanSummary'
import { AmortizationTable } from './AmortizationTable'
import { t } from '@/i18n'
import type { Loan } from '@/types'

const MAX_LOANS = 6

export function LoanList() {
  const { state, dispatch } = useAppState()
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null)

  function handleSave(loan: Loan) {
    if (editingLoan) {
      dispatch({ type: 'UPDATE_LOAN', loan })
    } else {
      dispatch({ type: 'ADD_LOAN', loan })
    }
    setEditingLoan(null)
    setIsAdding(false)
  }

  function handleDelete(loanId: string) {
    if (confirm(t('loan.deleteConfirm'))) {
      dispatch({ type: 'DELETE_LOAN', loanId })
      if (expandedLoanId === loanId) setExpandedLoanId(null)
    }
  }

  if (isAdding || editingLoan) {
    return (
      <div>
        <h3 className="text-sm font-semibold mb-3">
          {editingLoan ? t('loan.edit') : t('loan.add')}
        </h3>
        <LoanForm
          loan={editingLoan ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setEditingLoan(null)
            setIsAdding(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {state.prestecs.length === 0 ? (
          <p className="text-gray-400 text-xs">No hi ha préstecs. Afegeix-ne un per començar.</p>
        ) : (
          <div />
        )}
        <button
          data-tour="add-loan"
          onClick={() => setIsAdding(true)}
          disabled={state.prestecs.length >= MAX_LOANS}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title={state.prestecs.length >= MAX_LOANS ? t('loan.maxReached') : ''}
        >
          + {t('loan.add')}
        </button>
      </div>

      {state.prestecs.length > 0 && (
        <div className="space-y-2">
          {state.prestecs.map((loan) => (
            <div key={loan.id}>
              <LoanSummary
                loan={loan}
                isSelected={expandedLoanId === loan.id}
                onSelect={() => setExpandedLoanId(loan.id === expandedLoanId ? null : loan.id)}
                onEdit={() => setEditingLoan(loan)}
                onDelete={() => handleDelete(loan.id)}
              />
              {expandedLoanId === loan.id && (
                <div className="mt-1 ml-3 pl-3 border-l-2 border-blue-200">
                  <AmortizationTable loan={loan} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
