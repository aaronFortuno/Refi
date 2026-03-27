import { useState } from 'react'
import type { Loan, Penalty, PenaltyBracket, Insurance, ProjectionEntry } from '@/types'
import { t } from '@/i18n'
import { generateId, parseEuros } from '@/utils/validation'
import { EuriborProjections } from '@/components/euribor/EuriborProjections'

interface LoanFormProps {
  loan?: Loan
  onSave: (loan: Loan) => void
  onCancel: () => void
}

function emptyPenalty(): Penalty {
  return { brackets: [{ mesosMinim: 0, valor: 0, tipus: 'percentatge' }] }
}

function emptyLoan(): Loan {
  return {
    id: generateId(),
    nom: '',
    capitalPendent: 0,
    tin: 0,
    tipusInteres: 'fix',
    quotesRestants: 0,
    penalitzacio: {
      amortitzacioTotal: emptyPenalty(),
      amortitzacioParcial: emptyPenalty(),
    },
    assegurances: [],
  }
}

export function LoanForm({ loan, onSave, onCancel }: LoanFormProps) {
  const [form, setForm] = useState<Loan>(loan ?? emptyLoan())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isVariable = form.tipusInteres === 'variable'
  const computedTin = isVariable ? (form.indexReferencia ?? 0) + (form.diferencial ?? 0) : form.tin

  function update<K extends keyof Loan>(key: K, value: Loan[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Recalcular TIN automàticament si és variable
      if (next.tipusInteres === 'variable') {
        next.tin = (next.indexReferencia ?? 0) + (next.diferencial ?? 0)
      }
      return next
    })
  }

  function updatePenaltyBracket(
    type: 'amortitzacioTotal' | 'amortitzacioParcial',
    index: number,
    field: keyof PenaltyBracket,
    value: PenaltyBracket[keyof PenaltyBracket]
  ) {
    setForm((prev) => {
      const brackets = [...prev.penalitzacio[type].brackets]
      brackets[index] = { ...brackets[index]!, [field]: value }
      return {
        ...prev,
        penalitzacio: {
          ...prev.penalitzacio,
          [type]: { brackets },
        },
      }
    })
  }

  function addPenaltyBracket(type: 'amortitzacioTotal' | 'amortitzacioParcial') {
    setForm((prev) => ({
      ...prev,
      penalitzacio: {
        ...prev.penalitzacio,
        [type]: {
          brackets: [
            ...prev.penalitzacio[type].brackets,
            { mesosMinim: 12, valor: 0, tipus: 'percentatge' as const },
          ],
        },
      },
    }))
  }

  function removePenaltyBracket(type: 'amortitzacioTotal' | 'amortitzacioParcial', index: number) {
    setForm((prev) => ({
      ...prev,
      penalitzacio: {
        ...prev.penalitzacio,
        [type]: {
          brackets: prev.penalitzacio[type].brackets.filter((_, i) => i !== index),
        },
      },
    }))
  }

  function addInsurance() {
    const ins: Insurance = {
      id: generateId(),
      nom: '',
      tipus: 'asseguranca',
      costAnual: 0,
      obligatoria: false,
    }
    setForm((prev) => ({ ...prev, assegurances: [...prev.assegurances, ins] }))
  }

  function updateInsurance(id: string, field: keyof Insurance, value: Insurance[keyof Insurance]) {
    setForm((prev) => ({
      ...prev,
      assegurances: prev.assegurances.map((ins) =>
        ins.id === id ? { ...ins, [field]: value } : ins
      ),
    }))
  }

  function removeInsurance(id: string) {
    setForm((prev) => ({
      ...prev,
      assegurances: prev.assegurances.filter((ins) => ins.id !== id),
    }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.nom.trim()) errs.nom = 'Obligatori'
    if (form.capitalPendent <= 0) errs.capitalPendent = 'Ha de ser positiu'
    const tinEffectiu = form.tipusInteres === 'variable'
      ? (form.indexReferencia ?? 0) + (form.diferencial ?? 0)
      : form.tin
    if (tinEffectiu < 0) errs.tin = 'No pot ser negatiu'
    if (form.quotesRestants <= 0) errs.quotesRestants = 'Ha de ser positiu'
    if (form.tipusInteres === 'variable') {
      if (form.diferencial === undefined || form.diferencial < 0) errs.diferencial = 'Obligatori'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const toSave = { ...form }
    if (toSave.tipusInteres === 'variable') {
      toSave.tin = (toSave.indexReferencia ?? 0) + (toSave.diferencial ?? 0)
    }
    onSave(toSave)
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const errorClass = 'text-red-600 text-xs mt-0.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Dades bàsiques */}
      <fieldset className="space-y-4">
        <div>
          <label className={labelClass}>{t('loan.name')}</label>
          <input
            className={inputClass}
            value={form.nom}
            onChange={(e) => update('nom', e.target.value)}
            placeholder={t('loan.namePlaceholder')}
          />
          {errors.nom && <p className={errorClass}>{errors.nom}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>{t('loan.capitalPending')}</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.capitalPendent || ''}
              onChange={(e) => update('capitalPendent', parseEuros(e.target.value))}
            />
            {errors.capitalPendent && <p className={errorClass}>{errors.capitalPendent}</p>}
          </div>
          <div>
            <label className={labelClass}>
              {t('loan.tin')}
              {isVariable && <span className="text-xs text-gray-400 ml-1">(auto)</span>}
            </label>
            <input
              type="number"
              step="0.01"
              className={`${inputClass} ${isVariable ? 'bg-gray-100 text-gray-500' : ''}`}
              value={isVariable ? computedTin : (form.tin || '')}
              onChange={(e) => update('tin', parseFloat(e.target.value) || 0)}
              readOnly={isVariable}
              tabIndex={isVariable ? -1 : undefined}
            />
            {errors.tin && <p className={errorClass}>{errors.tin}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('loan.remainingPayments')}</label>
            <input
              type="number"
              step="1"
              className={inputClass}
              value={form.quotesRestants || ''}
              onChange={(e) => update('quotesRestants', parseInt(e.target.value) || 0)}
            />
            {errors.quotesRestants && <p className={errorClass}>{errors.quotesRestants}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('loan.interestType')}</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={form.tipusInteres === 'fix'}
                onChange={() => update('tipusInteres', 'fix')}
              />
              {t('loan.fixed')}
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={form.tipusInteres === 'variable'}
                onChange={() => update('tipusInteres', 'variable')}
              />
              {t('loan.variable')}
            </label>
          </div>
        </div>

        {form.tipusInteres === 'variable' && (
          <>
            <div className="grid grid-cols-3 gap-4 pl-4 border-l-2 border-blue-200">
              <div>
                <label className={labelClass}>{t('loan.referenceIndex')}</label>
                <input
                  type="number"
                  step="0.001"
                  className={inputClass}
                  value={form.indexReferencia ?? ''}
                  onChange={(e) => update('indexReferencia', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>{t('loan.spread')}</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.diferencial ?? ''}
                  onChange={(e) => update('diferencial', parseFloat(e.target.value) || 0)}
                />
                {errors.diferencial && <p className={errorClass}>{errors.diferencial}</p>}
              </div>
              <div>
                <label className={labelClass}>{t('loan.nextReview')}</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.dataProperaRevisio ?? ''}
                  onChange={(e) => update('dataProperaRevisio', e.target.value)}
                />
              </div>
            </div>

            {form.quotesRestants > 0 && (
              <div className="pl-4 border-l-2 border-blue-200 mt-3">
                <EuriborProjections
                  projections={form.projeccionsEuribor ?? []}
                  euriborActual={form.indexReferencia ?? 0}
                  diferencial={form.diferencial ?? 0}
                  capitalPendent={form.capitalPendent}
                  quotesRestants={form.quotesRestants}
                  onChange={(projections: ProjectionEntry[]) => update('projeccionsEuribor', projections)}
                />
              </div>
            )}
          </>
        )}
      </fieldset>

      {/* Penalitzacions */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-gray-800">{t('loan.penalty')}</legend>
        {(['amortitzacioTotal', 'amortitzacioParcial'] as const).map((type) => (
          <div key={type} className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t(type === 'amortitzacioTotal' ? 'loan.penaltyTotal' : 'loan.penaltyPartial')}
            </p>
            <div className="space-y-2 pl-4 border-l-2 border-orange-200">
              {form.penalitzacio[type].brackets.map((bracket, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-3 items-end">
                  <div>
                    <label className={labelClass}>
                      {bracket.mesosMinim === 0 ? t('loan.penaltyDefault') : t('loan.penaltyBracketThreshold')}
                    </label>
                    {bracket.mesosMinim === 0 ? (
                      <input
                        className={`${inputClass} bg-gray-100 text-gray-500`}
                        value={t('loan.penaltyDefault')}
                        readOnly
                        tabIndex={-1}
                      />
                    ) : (
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className={inputClass}
                        value={bracket.mesosMinim}
                        onChange={(e) => updatePenaltyBracket(type, idx, 'mesosMinim', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>{t('loan.penaltyType')}</label>
                    <select
                      className={inputClass}
                      value={bracket.tipus}
                      onChange={(e) => updatePenaltyBracket(type, idx, 'tipus', e.target.value as 'percentatge' | 'fix')}
                    >
                      <option value="percentatge">{t('common.percentage')}</option>
                      <option value="fix">{t('common.fixed')}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t('loan.penaltyValue')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClass}
                      value={bracket.valor}
                      onChange={(e) => updatePenaltyBracket(type, idx, 'valor', Math.max(0, parseEuros(e.target.value)))}
                      placeholder={bracket.tipus === 'percentatge' ? '%' : '€'}
                    />
                  </div>
                  <div>
                    {bracket.mesosMinim !== 0 && (
                      <button
                        type="button"
                        onClick={() => removePenaltyBracket(type, idx)}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addPenaltyBracket(type)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + {t('loan.penaltyAddBracket')}
              </button>
            </div>
          </div>
        ))}
      </fieldset>

      {/* Costos vinculats */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-800">{t('loan.insurance')}</legend>
        {form.assegurances.map((ins) => (
          <div key={ins.id} className="space-y-2 pl-4 border-l-2 border-amber-200 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>{t('loan.insuranceName')}</label>
                <input
                  className={inputClass}
                  value={ins.nom}
                  onChange={(e) => updateInsurance(ins.id, 'nom', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>{t('loan.insuranceType')}</label>
                <select
                  className={inputClass}
                  value={ins.tipus ?? 'asseguranca'}
                  onChange={(e) => updateInsurance(ins.id, 'tipus', e.target.value)}
                >
                  <option value="asseguranca">{t('loan.insuranceTypeAsseguranca')}</option>
                  <option value="manteniment">{t('loan.insuranceTypeManteniment')}</option>
                  <option value="bonificacio">{t('loan.insuranceTypeBonificacio')}</option>
                  <option value="altre">{t('loan.insuranceTypeAltre')}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('loan.insuranceAnnualCost')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={ins.costAnual || ''}
                  onChange={(e) => updateInsurance(ins.id, 'costAnual', parseEuros(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={ins.obligatoria}
                    onChange={(e) => updateInsurance(ins.id, 'obligatoria', e.target.checked)}
                  />
                  {t('loan.insuranceMandatory')}
                </label>
              </div>
              <div>
                <label className={labelClass}>{t('loan.insuranceSpreadWithout')}</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={ins.diferencialSense ?? ''}
                  onChange={(e) => updateInsurance(ins.id, 'diferencialSense', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => removeInsurance(ins.id)}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                {t('common.delete')}
              </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addInsurance}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + {t('loan.insuranceAdd')}
        </button>
      </fieldset>

      {/* Botons */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
        >
          {t('loan.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
        >
          {t('loan.cancel')}
        </button>
      </div>
    </form>
  )
}
