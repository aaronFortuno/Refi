import { useMemo, useState } from 'react'
import type { Loan, AmortizationRow } from '@/types'
import { generarQuadrePrestec } from '@/engine/amortization'
import { MoneyCell } from '@/components/shared/MoneyCell'
import { formatCurrency } from '@/utils/formatting'
import { t } from '@/i18n'

interface AmortizationTableProps {
  loan: Loan
}

interface YearlyRow {
  any: number
  quotaTotal: number
  interessosTotal: number
  amortitzacioTotal: number
  capitalFinal: number
}

function aggregateYearly(rows: AmortizationRow[]): YearlyRow[] {
  const yearMap = new Map<number, YearlyRow>()

  rows.forEach((row) => {
    const yearIndex = Math.ceil(row.mes / 12)
    const existing = yearMap.get(yearIndex)
    if (existing) {
      existing.quotaTotal += row.quotaMensual
      existing.interessosTotal += row.interessos
      existing.amortitzacioTotal += row.amortitzacioCapital
      existing.capitalFinal = row.capitalPendent
    } else {
      yearMap.set(yearIndex, {
        any: yearIndex,
        quotaTotal: row.quotaMensual,
        interessosTotal: row.interessos,
        amortitzacioTotal: row.amortitzacioCapital,
        capitalFinal: row.capitalPendent,
      })
    }
  })

  return Array.from(yearMap.values())
}

export function AmortizationTable({ loan }: AmortizationTableProps) {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly')

  const result = useMemo(() => generarQuadrePrestec(loan), [loan])
  const yearlyRows = useMemo(() => aggregateYearly(result.rows), [result.rows])

  const isVariable = loan.tipusInteres === 'variable'

  const thClass = 'px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'

  return (
    <div className="space-y-3">
      {/* Resum */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded">
        <div>
          <p className="text-[10px] text-gray-500">
            {t('loan.monthlyPayment')}
            {isVariable && <span className="ml-1 text-amber-600">(actual)</span>}
          </p>
          <p className="text-sm font-semibold">{formatCurrency(result.quotaMensual)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">{t('loan.totalInterest')}</p>
          <p className="text-sm font-semibold text-red-700">{formatCurrency(result.totalInteressos)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">{t('loan.totalPaid')}</p>
          <p className="text-sm font-semibold">{formatCurrency(result.totalPagat)}</p>
        </div>
      </div>

      {/* Toggle vista */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('monthly')}
          className={`px-3 py-1 text-sm rounded ${
            viewMode === 'monthly' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {t('amortization.viewMonthly')}
        </button>
        <button
          onClick={() => setViewMode('yearly')}
          className={`px-3 py-1 text-sm rounded ${
            viewMode === 'yearly' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {t('amortization.viewYearly')}
        </button>
      </div>

      {/* Taula */}
      <div className="overflow-auto max-h-96 border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className={thClass}>
                {viewMode === 'monthly' ? t('amortization.month') : t('amortization.year')}
              </th>
              <th className={`${thClass} text-right`}>{t('amortization.payment')}</th>
              <th className={`${thClass} text-right`}>{t('amortization.interest')}</th>
              <th className={`${thClass} text-right`}>{t('amortization.principal')}</th>
              <th className={`${thClass} text-right`}>{t('amortization.balance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {viewMode === 'monthly'
              ? result.rows.map((row) => (
                  <tr key={row.mes} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{row.mes}</td>
                    <MoneyCell value={row.quotaMensual} />
                    <MoneyCell value={row.interessos} highlight="cost" />
                    <MoneyCell value={row.amortitzacioCapital} highlight="saving" />
                    <MoneyCell value={row.capitalPendent} />
                  </tr>
                ))
              : yearlyRows.map((row) => (
                  <tr key={row.any} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{row.any}</td>
                    <MoneyCell value={row.quotaTotal} />
                    <MoneyCell value={row.interessosTotal} highlight="cost" />
                    <MoneyCell value={row.amortitzacioTotal} highlight="saving" />
                    <MoneyCell value={row.capitalFinal} />
                  </tr>
                ))}
          </tbody>
          <tfoot className="bg-gray-50 font-medium">
            <tr>
              <td className="px-3 py-2">{t('amortization.total')}</td>
              <MoneyCell value={result.totalPagat} />
              <MoneyCell value={result.totalInteressos} highlight="cost" />
              <MoneyCell value={loan.capitalPendent} highlight="saving" />
              <MoneyCell value={0} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
