import { useMemo } from 'react'
import type { Loan } from '@/types'
import { generarQuadrePrestec } from '@/engine/amortization'
import { formatCurrency, formatPercentage } from '@/utils/formatting'
import { t } from '@/i18n'

interface LoanSummaryProps {
  loan: Loan
  onEdit: () => void
  onDelete: () => void
  onSelect: () => void
  isSelected: boolean
}

export function LoanSummary({ loan, onEdit, onDelete, onSelect, isSelected }: LoanSummaryProps) {
  const result = useMemo(() => generarQuadrePrestec(loan), [loan])

  const yearsRemaining = Math.ceil(loan.quotesRestants / 12)
  const totalInsurance = loan.assegurances.reduce((sum, ins) => sum + ins.costAnual * yearsRemaining, 0)

  return (
    <div
      className={`border rounded p-3 cursor-pointer transition-colors ${
        isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-900">{loan.nom}</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            loan.tipusInteres === 'fix' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {loan.tipusInteres === 'fix' ? t('loan.fixed') : t('loan.variable')}
            {' '}{formatPercentage(loan.tin)}
          </span>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="text-[10px] px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 rounded">
            {t('common.edit')}
          </button>
          <button onClick={onDelete} className="text-[10px] px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded">
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-gray-600">
        <span>{formatCurrency(loan.capitalPendent)}</span>
        <span>{formatCurrency(result.quotaMensual)}/mes</span>
        <span className="text-red-600">{formatCurrency(result.totalInteressos)} int.</span>
        <span>{loan.quotesRestants}m ({yearsRemaining}a)</span>
        {totalInsurance > 0 && (
          <span className="text-amber-600">{formatCurrency(totalInsurance)} costos vinc.</span>
        )}
      </div>
    </div>
  )
}
