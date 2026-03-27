import { useRef } from 'react'
import { useAppState } from '@/store/context'
import { downloadJson, importStateFromJson } from '@/store/persistence'
import { t } from '@/i18n'

const btnClass = 'px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300'

export function ExportImport() {
  const { state, dispatch } = useAppState()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    downloadJson(state)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = importStateFromJson(event.target?.result as string)
        dispatch({ type: 'IMPORT_STATE', state: imported })
      } catch {
        alert('Error important el fitxer. Comprova que el format és correcte.')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClear() {
    if (confirm(t('common.clearAllConfirm'))) {
      dispatch({ type: 'CLEAR_ALL' })
    }
  }

  return (
    <div className="flex gap-1.5">
      <button onClick={handleExport} className={btnClass}>
        {t('common.export')}
      </button>
      <label className={`${btnClass} cursor-pointer`}>
        {t('common.import')}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </label>
      <button
        onClick={handleClear}
        className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
      >
        {t('common.clearAll')}
      </button>
    </div>
  )
}
