import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { LoanList } from '@/components/loans/LoanList'
import { PartialAmortization } from '@/components/simulation/PartialAmortization'
import { InsuranceAnalysis } from '@/components/insurance/InsuranceAnalysis'
import { ScenarioList } from '@/components/scenarios/ScenarioList'
import { Collapsible } from '@/components/shared/Collapsible'
import { Tour } from '@/components/tour/Tour'
import { tourSteps } from '@/components/tour/tourSteps'
import { useAppState } from '@/store/context'
import { t } from '@/i18n'

const TOUR_SEEN_KEY = 'refi-tour-seen'

export default function App() {
  const { state } = useAppState()
  const hasLoans = state.prestecs.length > 0
  const [tourOpen, setTourOpen] = useState(() => !localStorage.getItem(TOUR_SEEN_KEY))

  function closeTour() {
    setTourOpen(false)
    localStorage.setItem(TOUR_SEEN_KEY, '1')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f7f3' }}>
      <Header onStartTour={() => setTourOpen(true)} />
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Préstecs */}
        <Collapsible
          title={t('loan.title')}
          badge={hasLoans ? `${state.prestecs.length}` : undefined}
          defaultOpen={!hasLoans}
          dataTour="loans"
        >
          <LoanList />
        </Collapsible>

        {/* Eines */}
        {hasLoans && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Collapsible title={t('partialAmort.title')} defaultOpen={true} dataTour="partial-amort">
                <PartialAmortization />
              </Collapsible>
            </div>
            <div>
              <Collapsible title={t('analysis.title')} defaultOpen={true} dataTour="insurance-analysis">
                <InsuranceAnalysis />
              </Collapsible>
            </div>
          </div>
        )}

        {/* Escenaris */}
        {hasLoans && (
          <Collapsible
            title={t('scenario.title')}
            badge={state.escenaris.length > 0 ? `${state.escenaris.length}` : undefined}
            defaultOpen={true}
            dataTour="scenarios"
          >
            <ScenarioList />
          </Collapsible>
        )}
      </main>

      <Tour steps={tourSteps} isOpen={tourOpen} onClose={closeTour} />
    </div>
  )
}
