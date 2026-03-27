import { t } from '@/i18n'
import { ExportImport } from '@/components/shared/ExportImport'

interface HeaderProps {
  onStartTour?: () => void
}

export function Header({ onStartTour }: HeaderProps) {
  return (
    <header data-tour="header" className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">{t('app.title')}</h1>
          <p className="text-xs text-gray-400">{t('app.subtitle')}</p>
        </div>
        {onStartTour && (
          <button
            onClick={onStartTour}
            className="px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
            title="Visita guiada"
          >
            ? Guia
          </button>
        )}
      </div>
      <div data-tour="export-import">
        <ExportImport />
      </div>
    </header>
  )
}
