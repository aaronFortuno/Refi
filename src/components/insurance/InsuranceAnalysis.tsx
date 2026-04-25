import { useMemo } from 'react'
import { useAppState } from '@/store/context'
import { analitzarTotsElsCostos, type LinkedCostAnalysis } from '@/engine/insurance'
import { formatCurrency } from '@/utils/formatting'
import { t } from '@/i18n'

export function InsuranceAnalysis() {
  const { state } = useAppState()

  const analyses: LinkedCostAnalysis[] = useMemo(
    () => analitzarTotsElsCostos(state.prestecs),
    [state.prestecs]
  )

  if (analyses.length === 0) {
    return <p className="text-sm text-gray-400">{t('analysis.noLinkedCosts')}</p>
  }

  function recColor(rec: LinkedCostAnalysis['recomanacio']) {
    switch (rec) {
      case 'mantenir': return 'bg-green-50 text-green-700 border-green-200'
      case 'eliminar': return 'bg-red-50 text-red-700 border-red-200'
      case 'obligatori': return 'bg-gray-50 text-gray-600 border-gray-200'
      case 'sense_bonificacio': return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  function recText(rec: LinkedCostAnalysis['recomanacio']) {
    switch (rec) {
      case 'mantenir': return t('analysis.keepIt')
      case 'eliminar': return t('analysis.removeIt')
      case 'obligatori': return t('analysis.mandatory')
      case 'sense_bonificacio': return t('analysis.noBenefit')
    }
  }

  const typeLabels: Record<string, string> = {
    asseguranca: t('loan.insuranceTypeAsseguranca'),
    manteniment: t('loan.insuranceTypeManteniment'),
    bonificacio: t('loan.insuranceTypeBonificacio'),
    altre: t('loan.insuranceTypeAltre'),
  }

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">{t('analysis.title')}</h3>

      <div className="space-y-3">
        {analyses.map((a) => (
          <div key={a.insurance.id} className={`border rounded-lg p-4 ${recColor(a.recomanacio)}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm">{a.insurance.nom}</h4>
                <p className="text-xs opacity-75">
                  {typeLabels[a.insurance.tipus ?? 'altre']} — {a.loanNom}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded border font-medium">
                {recText(a.recomanacio)}
              </span>
            </div>

            {a.recomanacio !== 'obligatori' && a.recomanacio !== 'sense_bonificacio' ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs opacity-75">{t('analysis.totalCost')}</p>
                  <p className="font-medium">{formatCurrency(a.costTotalVidaPrestec)}</p>
                  <p className="text-[10px] opacity-60">{formatCurrency(a.insurance.costAnual)}/any</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">{t('analysis.extraInterest')}</p>
                  <p className="font-medium">{formatCurrency(a.extraInteressosSense)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">{t('analysis.netResult')}</p>
                  <p className="font-medium">
                    {a.estalviNet >= 0 ? '+' : ''}{formatCurrency(a.estalviNet)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <p className="text-xs opacity-75">{t('analysis.totalCost')}</p>
                <p className="font-medium">{formatCurrency(a.costTotalVidaPrestec)}</p>
                <p className="text-[10px] opacity-60">{formatCurrency(a.insurance.costAnual)}/any</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
