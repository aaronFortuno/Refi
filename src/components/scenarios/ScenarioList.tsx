import { useState } from 'react'
import { useAppState } from '@/store/context'
import { ScenarioEditor } from './ScenarioEditor'
import { ScenarioResult } from './ScenarioResult'
import { ScenarioComparator } from './ScenarioComparator'
import { t } from '@/i18n'
import type { Scenario } from '@/types'

export function ScenarioList() {
  const { state, dispatch } = useAppState()
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  const selectedScenario = state.escenaris.find((s) => s.id === selectedScenarioId)

  function handleSave(scenario: Scenario) {
    if (editingScenario) {
      dispatch({ type: 'UPDATE_SCENARIO', scenario })
    } else {
      dispatch({ type: 'ADD_SCENARIO', scenario })
    }
    setEditingScenario(null)
    setIsAdding(false)
    setSelectedScenarioId(scenario.id)
  }

  function handleDelete(scenarioId: string) {
    if (confirm(t('scenario.deleteConfirm'))) {
      dispatch({ type: 'DELETE_SCENARIO', scenarioId })
      if (selectedScenarioId === scenarioId) setSelectedScenarioId(null)
    }
  }

  if (isAdding || editingScenario) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {editingScenario ? t('scenario.edit') : t('scenario.add')}
        </h2>
        <ScenarioEditor
          scenario={editingScenario ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setEditingScenario(null)
            setIsAdding(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('scenario.title')}</h2>
        <button
          onClick={() => setIsAdding(true)}
          disabled={state.prestecs.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title={state.prestecs.length === 0 ? t('scenario.needLoansFirst') : ''}
        >
          + {t('scenario.add')}
        </button>
      </div>

      {state.prestecs.length === 0 && (
        <p className="text-gray-400 text-sm py-4">{t('scenario.needLoansFirst')}</p>
      )}

      {state.escenaris.length === 0 && state.prestecs.length > 0 && (
        <p className="text-gray-500 text-sm py-8 text-center">
          {t('scenario.noScenarios')}
        </p>
      )}

      {state.escenaris.length > 0 && (
        <div className="space-y-6">
          {/* Taula comparativa (quan hi ha 2+ escenaris) */}
          {state.escenaris.length >= 2 && <ScenarioComparator />}

          {/* Llista d'escenaris */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.escenaris.map((scenario) => (
              <div
                key={scenario.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedScenarioId === scenario.id
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() =>
                  setSelectedScenarioId(
                    scenario.id === selectedScenarioId ? null : scenario.id
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{scenario.nom}</h3>
                    {scenario.descripcio && (
                      <p className="text-xs text-gray-500 mt-0.5">{scenario.descripcio}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {scenario.prestecsCancelats.length} {t('scenario.cancelledLoans')} · {scenario.prestecsNous.length} {t('scenario.newLoansCount')}
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingScenario(scenario)}
                      className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resultat de l'escenari seleccionat */}
          {selectedScenario && (
            <div>
              <h3 className="text-md font-semibold mb-3">
                {t('scenario.result')} — {selectedScenario.nom}
              </h3>
              <ScenarioResult scenario={selectedScenario} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
