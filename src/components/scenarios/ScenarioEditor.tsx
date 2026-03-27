import { useState, useMemo } from 'react'
import type { Scenario, CancelAction, Loan } from '@/types'
import { useAppState } from '@/store/context'
import { LoanForm } from '@/components/loans/LoanForm'
import { calcularResultatEscenari } from '@/engine/refinancing'
import { formatCurrency } from '@/utils/formatting'
import { MoneyCell } from '@/components/shared/MoneyCell'
import { generateId, parseEuros } from '@/utils/validation'
import { t } from '@/i18n'

interface ScenarioEditorProps {
  scenario?: Scenario
  onSave: (scenario: Scenario) => void
  onCancel: () => void
}

function emptyScenario(): Scenario {
  return {
    id: generateId(),
    nom: '',
    descripcio: '',
    prestecsCancelats: [],
    prestecsNous: [],
  }
}

export function ScenarioEditor({ scenario, onSave, onCancel }: ScenarioEditorProps) {
  const { state } = useAppState()
  const [form, setForm] = useState<Scenario>(scenario ?? emptyScenario())
  const [addingNewLoan, setAddingNewLoan] = useState(false)
  const [editingNewLoanIndex, setEditingNewLoanIndex] = useState<number | null>(null)

  // Resultat en temps real
  const hasContent = form.prestecsCancelats.length > 0 || form.prestecsNous.length > 0
  const result = useMemo(() => {
    if (!hasContent) return null
    return calcularResultatEscenari(form, state)
  }, [form, state, hasContent])

  // Pressupost: total disponible dels nous préstecs vs total assignat a amortitzacions
  const totalDisponible = form.prestecsNous.reduce((sum, l) => sum + l.capitalPendent, 0)
  const totalAssignat = form.prestecsCancelats.reduce((sum, c) => {
    if (c.tipus === 'total') {
      const loan = state.prestecs.find((l) => l.id === c.loanId)
      return sum + (loan?.capitalPendent ?? 0)
    }
    return sum + (c.importParcial ?? 0)
  }, 0)
  const sobrant = totalDisponible - totalAssignat

  function calcularMaxParcial(loanId: string): number {
    const loan = state.prestecs.find((l) => l.id === loanId)
    if (!loan) return 0
    const cancel = form.prestecsCancelats.find((c) => c.loanId === loanId)
    const jaAssignat = cancel?.importParcial ?? 0
    // Pot assignar fins al menor entre: el capital del préstec, o el sobrant + el que ja tenia
    return Math.min(loan.capitalPendent, sobrant + jaAssignat)
  }

  function assignarDiferencia(loanId: string) {
    const max = calcularMaxParcial(loanId)
    updateCancelAction(loanId, { importParcial: Math.round(Math.max(0, max) * 100) / 100 })
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  function toggleCancelLoan(loanId: string) {
    const existing = form.prestecsCancelats.find((c) => c.loanId === loanId)
    if (existing) {
      setForm((prev) => ({
        ...prev,
        prestecsCancelats: prev.prestecsCancelats.filter((c) => c.loanId !== loanId),
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        prestecsCancelats: [
          ...prev.prestecsCancelats,
          { loanId, tipus: 'total' as const, modeAmortitzacio: 'reduirTermini' as const },
        ],
      }))
    }
  }

  function updateCancelAction(loanId: string, update: Partial<CancelAction>) {
    setForm((prev) => ({
      ...prev,
      prestecsCancelats: prev.prestecsCancelats.map((c) =>
        c.loanId === loanId ? { ...c, ...update } : c
      ),
    }))
  }

  function addNewLoan(loan: Loan) {
    if (editingNewLoanIndex !== null) {
      setForm((prev) => ({
        ...prev,
        prestecsNous: prev.prestecsNous.map((l, i) =>
          i === editingNewLoanIndex ? loan : l
        ),
      }))
      setEditingNewLoanIndex(null)
    } else {
      setForm((prev) => ({
        ...prev,
        prestecsNous: [...prev.prestecsNous, loan],
      }))
      setAddingNewLoan(false)
    }
  }

  function removeNewLoan(index: number) {
    setForm((prev) => ({
      ...prev,
      prestecsNous: prev.prestecsNous.filter((_, i) => i !== index),
    }))
  }

  function handleSave() {
    if (!form.nom.trim()) return
    onSave(form)
  }

  if (addingNewLoan || editingNewLoanIndex !== null) {
    return (
      <div>
        <h3 className="text-md font-semibold mb-4">
          {editingNewLoanIndex !== null ? t('scenario.editNewLoan') : t('scenario.addNewLoan')}
        </h3>
        <LoanForm
          loan={editingNewLoanIndex !== null ? form.prestecsNous[editingNewLoanIndex] : undefined}
          onSave={addNewLoan}
          onCancel={() => {
            setAddingNewLoan(false)
            setEditingNewLoanIndex(null)
          }}
        />
      </div>
    )
  }

  const refi = result?.costRefinancament
  const isSaving = result ? result.estalviNet > 0 : false

  return (
    <div className="flex gap-6">
      {/* Columna esquerra: controls */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Nom */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>{t('scenario.name')}</label>
            <input
              className={inputClass}
              value={form.nom}
              onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
              placeholder={t('scenario.namePlaceholder')}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSave}
              disabled={!form.nom.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {t('common.save')}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>

        {/* Préstecs a cancel·lar */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-gray-800">{t('scenario.loansToCancel')}</legend>
          {state.prestecs.length === 0 ? (
            <p className="text-sm text-gray-400">{t('scenario.noLoansAvailable')}</p>
          ) : (
            state.prestecs.map((loan) => {
              const cancel = form.prestecsCancelats.find((c) => c.loanId === loan.id)
              return (
                <div
                  key={loan.id}
                  className={`border rounded-lg p-3 transition-colors ${cancel ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!cancel}
                      onChange={() => toggleCancelLoan(loan.id)}
                    />
                    <span className="font-medium text-sm">{loan.nom}</span>
                    <span className="text-xs text-gray-500">
                      ({formatCurrency(loan.capitalPendent)} · {loan.quotesRestants} {t('common.months')})
                    </span>
                  </label>

                  {cancel && (
                    <div className="mt-2 pl-6 space-y-2">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-sm">
                          <input
                            type="radio"
                            checked={cancel.tipus === 'total'}
                            onChange={() => updateCancelAction(loan.id, { tipus: 'total', importParcial: undefined })}
                          />
                          {t('scenario.cancelTotal')}
                        </label>
                        <label className="flex items-center gap-1.5 text-sm">
                          <input
                            type="radio"
                            checked={cancel.tipus === 'parcial'}
                            onChange={() => updateCancelAction(loan.id, { tipus: 'parcial', importParcial: 0, modeAmortitzacio: cancel.modeAmortitzacio ?? 'reduirTermini' })}
                          />
                          {t('scenario.cancelPartial')}
                        </label>
                      </div>

                      {cancel.tipus === 'parcial' && (() => {
                        const maxParcial = calcularMaxParcial(loan.id)
                        return (
                          <div className="space-y-2">
                            <div className="flex gap-3 items-end">
                              <div className="flex-1">
                                <label className="text-xs text-gray-600">{t('scenario.partialAmount')}</label>
                                <input
                                  type="number"
                                  step="100"
                                  min="0"
                                  max={maxParcial}
                                  className={`${inputClass} ${(cancel.importParcial ?? 0) > maxParcial ? 'border-red-400 bg-red-50' : ''}`}
                                  value={cancel.importParcial ?? ''}
                                  onChange={(e) =>
                                    updateCancelAction(loan.id, {
                                      importParcial: Math.min(
                                        parseEuros(e.target.value),
                                        maxParcial
                                      ),
                                    })
                                  }
                                />
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {t('scenario.maxAvailable')}: {formatCurrency(maxParcial)}
                                </p>
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-gray-600">{t('scenario.amortMode')}</label>
                                <select
                                  className={inputClass}
                                  value={cancel.modeAmortitzacio ?? 'reduirTermini'}
                                  onChange={(e) =>
                                    updateCancelAction(loan.id, {
                                      modeAmortitzacio: e.target.value as 'reduirQuota' | 'reduirTermini',
                                    })
                                  }
                                >
                                  <option value="reduirTermini">{t('scenario.reduceTerm')}</option>
                                  <option value="reduirQuota">{t('scenario.reducePayment')}</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => assignarDiferencia(loan.id)}
                                disabled={sobrant <= 0 && (cancel.importParcial ?? 0) >= maxParcial}
                                className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded border border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {t('scenario.assignRemaining')}
                              </button>
                              <p className="text-xs text-gray-400">
                                {(cancel.modeAmortitzacio ?? 'reduirTermini') === 'reduirTermini'
                                  ? t('scenario.reduceTermDesc')
                                  : t('scenario.reducePaymentDesc')}
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </fieldset>

        {/* Nous préstecs */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-gray-800">{t('scenario.newLoans')}</legend>
          {form.prestecsNous.map((loan, idx) => (
            <div key={loan.id} className="flex items-center justify-between border rounded-lg p-3 border-green-200 bg-green-50">
              <div>
                <span className="font-medium text-sm">{loan.nom}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {formatCurrency(loan.capitalPendent)} · {loan.tin}% · {loan.quotesRestants} {t('common.months')}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingNewLoanIndex(idx)}
                  className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => removeNewLoan(idx)}
                  className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAddingNewLoan(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + {t('scenario.addNewLoan')}
          </button>
        </fieldset>

        {/* Indicador de pressupost */}
        {totalDisponible > 0 && (
          <div className={`p-3 rounded-lg border text-sm ${
            sobrant < 0 ? 'border-red-300 bg-red-50' : sobrant === 0 ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50'
          }`}>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('scenario.budgetAvailable')}</span>
              <span className="font-medium">{formatCurrency(totalDisponible)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('scenario.budgetAssigned')}</span>
              <span className="font-medium">{formatCurrency(totalAssignat)}</span>
            </div>
            <div className="flex justify-between border-t mt-1 pt-1">
              <span className="font-medium">{t('scenario.budgetRemaining')}</span>
              <span className={`font-bold ${sobrant < 0 ? 'text-red-700' : sobrant > 0 ? 'text-blue-700' : 'text-green-700'}`}>
                {formatCurrency(sobrant)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Columna dreta: resultats en temps real */}
      <div className="w-96 flex-shrink-0 space-y-4">
        <h3 className="text-sm font-semibold text-gray-600">{t('scenario.liveResult')}</h3>

        {!result ? (
          <p className="text-xs text-gray-400 py-8 text-center">
            {t('scenario.noLoansAvailable')}
          </p>
        ) : (
          <>
            {/* Resum */}
            <div className={`p-3 rounded-lg border-2 ${isSaving ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-600">{t('scenario.netSaving')}</span>
                  <span className={`text-xl font-bold ${isSaving ? 'text-green-700' : 'text-red-700'}`}>
                    {isSaving ? '+' : ''}{formatCurrency(result.estalviNet)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-600">{t('scenario.monthlyDiff')}</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(result.quotaActualTotal)} → {formatCurrency(result.novaQuotaMensualTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-600">{t('scenario.savingInterest')}</span>
                  <span className={`text-sm font-medium ${
                    result.costActual.totalInteressos > (refi!.totalInteressosNous + refi!.totalInteressosRestants)
                      ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(result.costActual.totalInteressos - refi!.totalInteressosNous - refi!.totalInteressosRestants)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-600">{t('scenario.breakEven')}</span>
                  <span className="text-sm">
                    {result.breakEvenMes === null
                      ? (isSaving ? t('scenario.breakEvenNotApplicable') : t('scenario.breakEvenNever'))
                      : result.breakEvenMes === 0
                        ? t('scenario.breakEvenImmediate')
                        : `${result.breakEvenMes} ${t('common.months')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Detall: situació actual */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-1.5">
                <span className="text-xs font-semibold text-gray-600">{t('scenario.currentSituation')}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {result.costActual.detallPrestecs.map((d) => (
                    <tr key={d.loanId}>
                      <td className="px-3 py-1.5 text-gray-700">{d.nom}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(d.quotaMensual)}/m</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 py-1.5 text-gray-500">{t('scenario.totalInterest')}</td>
                    <MoneyCell value={result.costActual.totalInteressos} highlight="cost" />
                  </tr>
                  <tr className="font-semibold">
                    <td className="px-3 py-1.5">{t('scenario.totalCost')}</td>
                    <MoneyCell value={result.costActual.costTotal} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Detall: refinançament */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-blue-800">{t('scenario.refinancing')}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {(refi!.totalPenalitzacions + refi!.comissionsObertura) > 0 && (
                    <tr className="bg-orange-50">
                      <td className="px-3 py-1.5 text-gray-600">{t('scenario.initialCosts')}</td>
                      <MoneyCell value={refi!.totalPenalitzacions + refi!.comissionsObertura} highlight="cost" />
                    </tr>
                  )}
                  {refi!.detallPrestecsRestants.map((d) => (
                    <tr key={`r-${d.loanId}`} className="bg-amber-50">
                      <td className="px-3 py-1.5 text-gray-700">{d.nom}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        <div>{formatCurrency(d.quotaMensual)}/m</div>
                        <div className="text-gray-400">{d.quotesRestants} {t('common.months')}</div>
                      </td>
                    </tr>
                  ))}
                  {refi!.detallPrestecsNous.map((d) => (
                    <tr key={`n-${d.loanId}`} className="bg-blue-50">
                      <td className="px-3 py-1.5 text-gray-700">{d.nom}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        <div>{formatCurrency(d.quotaMensual)}/m</div>
                        <div className="text-gray-400">{d.quotesRestants} {t('common.months')}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 py-1.5 text-gray-500">{t('scenario.totalInterest')}</td>
                    <MoneyCell value={refi!.totalInteressosNous + refi!.totalInteressosRestants} highlight="cost" />
                  </tr>
                  <tr className="font-semibold">
                    <td className="px-3 py-1.5">{t('scenario.totalCost')}</td>
                    <MoneyCell value={refi!.costTotal} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
