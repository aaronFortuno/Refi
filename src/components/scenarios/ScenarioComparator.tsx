import { useMemo } from 'react'
import { useAppState } from '@/store/context'
import { compararEscenaris, type ScenarioComparison } from '@/engine/comparator'
import { formatCurrency } from '@/utils/formatting'
import { MoneyCell } from '@/components/shared/MoneyCell'
import { t } from '@/i18n'

export function ScenarioComparator() {
  const { state } = useAppState()

  const comparisons: ScenarioComparison[] = useMemo(
    () => compararEscenaris(state.escenaris, state),
    [state]
  )

  if (state.escenaris.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-8 text-center">
        {t('scenario.noScenarios')}
      </p>
    )
  }

  if (comparisons.length === 0) return null

  const thClass = 'px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('scenario.comparison')}</h2>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className={thClass}>{t('scenario.name')}</th>
              <th className={`${thClass} text-right`}>{t('scenario.currentPayment')}</th>
              <th className={`${thClass} text-right`}>{t('scenario.newPayment')}</th>
              <th className={`${thClass} text-right`}>{t('scenario.initialCosts')}</th>
              <th className={`${thClass} text-right`}>{t('scenario.interestSaved')}</th>
              <th className={`${thClass} text-right`}>{t('scenario.netSaving')}</th>
              <th className={`${thClass} text-right`}>{t('scenario.breakEven')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comparisons.map((comp, idx) => {
              const r = comp.resultat
              const isBest = idx === 0 && r.estalviNet > 0
              const interestSaved =
                r.costActual.totalInteressos - r.costRefinancament.totalInteressosNous

              return (
                <tr
                  key={comp.scenarioId}
                  className={isBest ? 'bg-green-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{comp.nom}</span>
                    {isBest && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-200 text-green-800 rounded">
                        {t('scenario.bestOption')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(r.quotaActualTotal)}/mes
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(r.novaQuotaMensualTotal)}/mes
                  </td>
                  <MoneyCell
                    value={r.costRefinancament.totalPenalitzacions + r.costRefinancament.comissionsObertura}
                    highlight="cost"
                  />
                  <MoneyCell
                    value={interestSaved}
                    highlight={interestSaved > 0 ? 'saving' : 'cost'}
                  />
                  <MoneyCell
                    value={r.estalviNet}
                    highlight={r.estalviNet > 0 ? 'saving' : 'cost'}
                  />
                  <td className="px-4 py-3 text-right text-sm">
                    {r.breakEvenMes === null
                      ? (r.estalviNet > 0 ? t('scenario.breakEvenNotApplicable') : t('scenario.breakEvenNever'))
                      : r.breakEvenMes === 0
                        ? t('scenario.breakEvenImmediate')
                        : `${r.breakEvenMes} m`}
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
