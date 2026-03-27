import { useMemo } from 'react'
import type { Scenario } from '@/types'
import { useAppState } from '@/store/context'
import { calcularResultatEscenari, type ResultatEscenari } from '@/engine/refinancing'
import { formatCurrency } from '@/utils/formatting'
import { MoneyCell } from '@/components/shared/MoneyCell'
import { t } from '@/i18n'

interface ScenarioResultProps {
  scenario: Scenario
}

export function ScenarioResult({ scenario }: ScenarioResultProps) {
  const { state } = useAppState()

  const result: ResultatEscenari = useMemo(
    () => calcularResultatEscenari(scenario, state),
    [scenario, state]
  )

  const refi = result.costRefinancament
  const isSaving = result.estalviNet > 0
  const hasRestants = refi.detallPrestecsRestants.length > 0

  return (
    <div className="space-y-5">
      {/* Resum principal */}
      <div className={`p-4 rounded-lg border-2 ${isSaving ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">{t('scenario.netSaving')}</p>
            <p className={`text-2xl font-bold ${isSaving ? 'text-green-700' : 'text-red-700'}`}>
              {isSaving ? '+' : ''}{formatCurrency(result.estalviNet)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t('scenario.monthlyDiff')}</p>
            <p className="text-lg font-semibold">
              {formatCurrency(result.quotaActualTotal)} → {formatCurrency(result.novaQuotaMensualTotal)}
            </p>
            <p className={`text-sm ${result.quotaActualTotal > result.novaQuotaMensualTotal ? 'text-green-600' : 'text-red-600'}`}>
              ({result.quotaActualTotal > result.novaQuotaMensualTotal ? '-' : '+'}
              {formatCurrency(Math.abs(result.quotaActualTotal - result.novaQuotaMensualTotal))}/mes)
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t('scenario.breakEven')}</p>
            <p className="text-lg font-semibold">
              {result.breakEvenMes === null
                ? (isSaving ? t('scenario.breakEvenNotApplicable') : t('scenario.breakEvenNever'))
                : result.breakEvenMes === 0
                  ? t('scenario.breakEvenImmediate')
                  : `${result.breakEvenMes} ${t('common.months')} (${Math.ceil(result.breakEvenMes / 12)} ${t('common.years')})`}
            </p>
          </div>
        </div>
      </div>

      {/* Comparació detallada */}
      <div className="grid grid-cols-2 gap-4">
        {/* Situació actual */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2">
            <h4 className="text-sm font-semibold">{t('scenario.currentSituation')}</h4>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {result.costActual.detallPrestecs.map((d) => (
                <tr key={d.loanId}>
                  <td className="px-4 py-2 text-gray-700">{d.nom}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="text-gray-700">{formatCurrency(d.quotaMensual)}/mes</div>
                    <div className="text-xs text-gray-400">{d.quotesRestants} {t('common.months')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 text-sm">
              <tr>
                <td className="px-4 py-2 text-gray-600">{t('scenario.totalPayments')}</td>
                <MoneyCell value={result.costActual.totalQuotes} />
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">{t('scenario.totalInterest')}</td>
                <MoneyCell value={result.costActual.totalInteressos} highlight="cost" />
              </tr>
              {result.costActual.totalAssegurances > 0 && (
                <tr>
                  <td className="px-4 py-2 text-gray-600">{t('loan.insurance')}</td>
                  <MoneyCell value={result.costActual.totalAssegurances} highlight="cost" />
                </tr>
              )}
              <tr className="font-semibold">
                <td className="px-4 py-2">{t('scenario.totalCost')}</td>
                <MoneyCell value={result.costActual.costTotal} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Refinançament */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-4 py-2">
            <h4 className="text-sm font-semibold text-blue-800">{t('scenario.refinancing')}</h4>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {/* Costos inicials */}
              {refi.penalitzacions.map((p) => (
                <tr key={`pen-${p.loanId}`} className="bg-orange-50">
                  <td className="px-4 py-2 text-gray-700">
                    {t('loan.penalty')} {p.nom} ({p.tipus === 'total' ? t('scenario.cancelTotal') : t('scenario.cancelPartial')})
                  </td>
                  <MoneyCell value={p.import_} highlight="cost" />
                </tr>
              ))}
              {refi.comissionsObertura > 0 && (
                <tr className="bg-orange-50">
                  <td className="px-4 py-2 text-gray-700">{t('loan.openingFee')}</td>
                  <MoneyCell value={refi.comissionsObertura} highlight="cost" />
                </tr>
              )}

              {/* Préstecs restants (parcialment amortitzats) */}
              {refi.detallPrestecsRestants.map((d) => (
                <tr key={`rest-${d.loanId}`} className="bg-amber-50">
                  <td className="px-4 py-2 text-gray-700">
                    {d.nom}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="text-gray-700">{formatCurrency(d.quotaMensual)}/mes</div>
                    <div className="text-xs text-gray-400">{d.quotesRestants} {t('common.months')}</div>
                  </td>
                </tr>
              ))}

              {/* Nous préstecs */}
              {refi.detallPrestecsNous.map((d) => (
                <tr key={`nou-${d.loanId}`} className="bg-blue-50">
                  <td className="px-4 py-2 text-gray-700">
                    {d.nom}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="text-gray-700">{formatCurrency(d.quotaMensual)}/mes</div>
                    <div className="text-xs text-gray-400">{d.quotesRestants} {t('common.months')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 text-sm">
              {/* Desglossament préstecs restants */}
              {hasRestants && (
                <>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">{t('scenario.remainingLoans')}</td>
                    <MoneyCell value={refi.totalQuotesRestants} />
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600 pl-8 text-xs">{t('scenario.totalInterest')}</td>
                    <MoneyCell value={refi.totalInteressosRestants} highlight="cost" />
                  </tr>
                </>
              )}

              {/* Desglossament nous préstecs */}
              <tr>
                <td className="px-4 py-2 text-gray-600">{t('scenario.newLoansTotal')}</td>
                <MoneyCell value={refi.totalQuotesNous} />
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600 pl-8 text-xs">{t('scenario.totalInterest')}</td>
                <MoneyCell value={refi.totalInteressosNous} highlight="cost" />
              </tr>

              {/* Costos inicials */}
              {(refi.totalPenalitzacions + refi.comissionsObertura) > 0 && (
                <tr>
                  <td className="px-4 py-2 text-gray-600">{t('scenario.initialCosts')}</td>
                  <MoneyCell
                    value={refi.totalPenalitzacions + refi.comissionsObertura}
                    highlight="cost"
                  />
                </tr>
              )}

              {/* Total */}
              <tr className="font-semibold border-t-2">
                <td className="px-4 py-2">{t('scenario.totalCost')}</td>
                <MoneyCell value={refi.costTotal} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
