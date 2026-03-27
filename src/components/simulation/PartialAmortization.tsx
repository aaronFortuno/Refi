import { useState, useMemo } from 'react'
import { useAppState } from '@/store/context'
import { simularAmortitzacioParcial, generarQuadrePrestec } from '@/engine/amortization'
import { formatCurrency } from '@/utils/formatting'
import { parseEuros } from '@/utils/validation'
import { t } from '@/i18n'

export function PartialAmortization() {
  const { state } = useAppState()
  const [selectedLoanId, setSelectedLoanId] = useState<string>(state.prestecs[0]?.id ?? '')
  const [amount, setAmount] = useState(0)

  const loan = state.prestecs.find((l) => l.id === selectedLoanId)

  const result = useMemo(() => {
    if (!loan || amount <= 0 || amount >= loan.capitalPendent) return null
    return simularAmortitzacioParcial(loan.capitalPendent, loan.tin, loan.quotesRestants, amount)
  }, [loan, amount])

  const currentResult = useMemo(() => {
    if (!loan) return null
    return generarQuadrePrestec(loan)
  }, [loan])

  if (state.prestecs.length === 0) {
    return <p className="text-sm text-gray-400">{t('partialAmort.noLoans')}</p>
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
  const maxAmount = loan ? loan.capitalPendent - 1 : 0

  return (
    <div className="space-y-5 max-w-3xl">
      <h3 className="text-md font-semibold">{t('partialAmort.title')}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('partialAmort.selectLoan')}</label>
          <select
            className={inputClass}
            value={selectedLoanId}
            onChange={(e) => {
              setSelectedLoanId(e.target.value)
              setAmount(0)
            }}
          >
            {state.prestecs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom} ({formatCurrency(l.capitalPendent)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('partialAmort.amount')}</label>
          <input
            type="number"
            step="100"
            min="0"
            max={maxAmount}
            className={inputClass}
            value={amount || ''}
            onChange={(e) => setAmount(Math.min(parseEuros(e.target.value), maxAmount))}
          />
          {loan && (
            <input
              type="range"
              min="0"
              max={maxAmount}
              step="100"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="w-full mt-2"
            />
          )}
        </div>
      </div>

      {/* Resultats en temps real */}
      {loan && currentResult && (
        <div className="grid grid-cols-3 gap-4">
          {/* Situació actual */}
          <div className="border rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-500 mb-3">{t('partialAmort.currentSituation')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('loan.monthlyPayment')}</span>
                <span className="font-medium">{formatCurrency(currentResult.quotaMensual)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('loan.remainingPayments')}</span>
                <span className="font-medium">{loan.quotesRestants} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('loan.totalInterest')}</span>
                <span className="font-medium text-red-700">{formatCurrency(currentResult.totalInteressos)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-500">{t('loan.totalPaid')}</span>
                <span className="font-semibold">{formatCurrency(currentResult.totalPagat)}</span>
              </div>
            </div>
          </div>

          {/* Reduir quota */}
          <div className={`border rounded-lg p-4 ${result ? 'border-blue-200 bg-blue-50' : 'opacity-40'}`}>
            <h4 className="text-xs font-semibold text-blue-600 mb-3">{t('partialAmort.reducePayment')}</h4>
            {result ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('partialAmort.newPayment')}</span>
                  <span className="font-medium">{formatCurrency(result.reduirQuota.quotaMensual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('partialAmort.newTerm')}</span>
                  <span className="font-medium">{loan.quotesRestants} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('loan.totalInterest')}</span>
                  <span className="font-medium text-red-700">{formatCurrency(result.reduirQuota.totalInteressos)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-green-700">
                  <span>{t('partialAmort.interestSaved')}</span>
                  <span className="font-semibold">
                    {formatCurrency(currentResult.totalInteressos - result.reduirQuota.totalInteressos)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Introdueix un import</p>
            )}
          </div>

          {/* Reduir termini */}
          <div className={`border rounded-lg p-4 ${result ? 'border-green-200 bg-green-50' : 'opacity-40'}`}>
            <h4 className="text-xs font-semibold text-green-600 mb-3">{t('partialAmort.reduceTerm')}</h4>
            {result ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('partialAmort.newPayment')}</span>
                  <span className="font-medium">{formatCurrency(result.reduirTermini.quotaMensual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('partialAmort.newTerm')}</span>
                  <span className="font-medium">{result.reduirTermini.rows.length} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('loan.totalInterest')}</span>
                  <span className="font-medium text-red-700">{formatCurrency(result.reduirTermini.totalInteressos)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-green-700">
                  <span>{t('partialAmort.interestSaved')}</span>
                  <span className="font-semibold">
                    {formatCurrency(currentResult.totalInteressos - result.reduirTermini.totalInteressos)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Introdueix un import</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
