import { useMemo } from 'react'
import type { ProjectionEntry } from '@/types'
import { calcularQuotaMensual } from '@/engine/amortization'
import { formatCurrency } from '@/utils/formatting'
import { t } from '@/i18n'

interface EuriborProjectionsProps {
  projections: ProjectionEntry[]
  euriborActual: number
  diferencial: number
  capitalPendent: number
  quotesRestants: number
  onChange: (projections: ProjectionEntry[]) => void
}

interface YearSummary {
  euribor: number
  tin: number
  quotaMensual: number
  interessosAnuals: number
  principalAnual: number
  capitalFinal: number
}

export function EuriborProjections({
  projections,
  euriborActual,
  diferencial,
  capitalPendent,
  quotesRestants,
  onChange,
}: EuriborProjectionsProps) {
  const currentYear = new Date().getFullYear()
  const yearsRemaining = Math.ceil(quotesRestants / 12)
  const endYear = currentYear + yearsRemaining

  function getProjectionValue(year: number): number | null {
    const entry = projections.find((p) => p.any === year)
    return entry ? entry.euribor : null
  }

  function getEffectiveEuribor(year: number): number {
    for (let y = year; y >= currentYear; y--) {
      const entry = projections.find((p) => p.any === y)
      if (entry?.euribor !== null && entry?.euribor !== undefined) {
        return entry.euribor
      }
    }
    return euriborActual
  }

  function updateProjection(year: number, value: string) {
    const newProjections = projections.filter((p) => p.any !== year)
    if (value === '') {
      newProjections.push({ any: year, euribor: null })
    } else {
      newProjections.push({ any: year, euribor: parseFloat(value) })
    }
    newProjections.sort((a, b) => a.any - b.any)
    onChange(newProjections)
  }

  function removeProjection(year: number) {
    onChange(projections.filter((p) => p.any !== year))
  }

  const years: number[] = []
  for (let y = currentYear; y <= endYear; y++) {
    years.push(y)
  }

  const yearSummaries = useMemo(() => {
    const summaries = new Map<number, YearSummary>()
    let capital = capitalPendent
    let quotesRestantsCurrent = quotesRestants
    let quotaActual = 0
    let tinAnterior = -1 // Forçar recàlcul al primer any

    for (const year of years) {
      if (quotesRestantsCurrent <= 0 || capital <= 0) break

      const euribor = getEffectiveEuribor(year)
      const tin = euribor + diferencial
      const mesesAquestAny = Math.min(12, quotesRestantsCurrent)

      // Recalcular quota NOMÉS si el TIN ha canviat (simulant revisió anual)
      if (tin !== tinAnterior) {
        quotaActual = calcularQuotaMensual(capital, tin, quotesRestantsCurrent)
        tinAnterior = tin
      }

      const r = tin / 100 / 12
      let interessosAnuals = 0
      let principalAnual = 0

      for (let m = 0; m < mesesAquestAny; m++) {
        const interessos = capital * r
        const principal = quotaActual - interessos
        interessosAnuals += interessos
        principalAnual += principal
        capital = Math.max(0, capital - principal)
      }

      quotesRestantsCurrent -= mesesAquestAny

      summaries.set(year, {
        euribor,
        tin,
        quotaMensual: quotaActual,
        interessosAnuals,
        principalAnual,
        capitalFinal: capital,
      })
    }

    return summaries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capitalPendent, quotesRestants, diferencial, euriborActual, projections, years.length])

  const inputClass =
    'w-24 px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400'
  const thClass = 'px-2 py-1.5 text-right text-xs font-medium text-gray-500'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{t('euribor.title')}</h4>
        <span className="text-xs text-gray-500">
          {t('euribor.currentValue')}: {euriborActual}% + {t('loan.spread').toLowerCase()} {diferencial}% = <strong>{(euriborActual + diferencial).toFixed(2)}% TIN</strong>
        </span>
      </div>

      <p className="text-xs text-gray-500">{t('euribor.help')}</p>

      <div className="overflow-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">{t('euribor.year')}</th>
              <th className={thClass}>{t('euribor.projected')}</th>
              <th className={thClass}>{t('euribor.appliedTin')}</th>
              <th className={thClass}>{t('euribor.monthlyPayment')}</th>
              <th className={thClass}>{t('euribor.annualInterest')}</th>
              <th className={thClass}>{t('euribor.annualPrincipal')}</th>
              <th className={thClass}>{t('euribor.remainingBalance')}</th>
              <th className="px-1 py-1.5 w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {years.map((year) => {
              const projValue = getProjectionValue(year)
              const isInherited = projValue === null || projValue === undefined
              const hasEntry = projections.some((p) => p.any === year)
              const summary = yearSummaries.get(year)

              return (
                <tr key={year} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-gray-700 font-medium">{year}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className={inputClass}
                      value={projValue ?? ''}
                      onChange={(e) => updateProjection(year, e.target.value)}
                      placeholder={t('euribor.inheritPlaceholder')}
                    />
                  </td>
                  {summary ? (
                    <>
                      <td className="px-2 py-1.5 text-right tabular-nums" title={`${summary.euribor.toFixed(3)}% + ${diferencial}%`}>
                        <span className="font-medium text-gray-800">{summary.tin.toFixed(2)}%</span>
                        {isInherited && (
                          <span className="text-xs text-gray-400 ml-1 italic">({summary.euribor.toFixed(2)}+{diferencial})</span>
                        )}
                        {!isInherited && (
                          <span className="text-xs text-gray-400 ml-1">({summary.euribor.toFixed(2)}+{diferencial})</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                        {formatCurrency(summary.quotaMensual)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-red-700 bg-red-50">
                        {formatCurrency(summary.interessosAnuals)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-green-700 bg-green-50">
                        {formatCurrency(summary.principalAnual)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">
                        {formatCurrency(summary.capitalFinal)}
                      </td>
                    </>
                  ) : (
                    <td colSpan={6} className="px-2 py-1.5 text-right text-gray-300 text-xs">—</td>
                  )}
                  <td className="px-1 py-1.5">
                    {hasEntry && (
                      <button
                        type="button"
                        onClick={() => removeProjection(year)}
                        className="text-xs text-gray-400 hover:text-red-500"
                        title={t('common.delete')}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
