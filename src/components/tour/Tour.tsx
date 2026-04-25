import { useState, useEffect, useCallback, useRef } from 'react'

export interface TourStep {
  target: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  beforeShow?: () => void // Executar abans de mostrar el pas (ex: desplegar una secció)
}

interface TourProps {
  steps: TourStep[]
  isOpen: boolean
  onClose: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export function Tour({ steps, isOpen, onClose }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [visible, setVisible] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const rafRef = useRef(0)

  const step = steps[currentStep]

  const measureAndPosition = useCallback(() => {
    if (!step) return
    step.beforeShow?.()

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = document.querySelector(step.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
        setTransitioning(false)
        setVisible(true)
        // Scroll i re-mesurar un cop estabilitzat
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          const r = el.getBoundingClientRect()
          setTargetRect({
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
          })
        }, 350)
      } else {
        setTargetRect(null)
        setTransitioning(false)
        setVisible(true)
      }
    })
  }, [step])

  useEffect(() => {
    if (!isOpen) {
      setVisible(false)
      return
    }
    measureAndPosition()

    const handleResize = () => {
      if (!step) return
      const el = document.querySelector(step.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [isOpen, currentStep, measureAndPosition, step])

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setVisible(false)
    }
  }, [isOpen])

  function goTo(nextStep: number) {
    setTransitioning(true)
    setCurrentStep(nextStep)
  }

  if (!isOpen || !step) return null

  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const pos = step.position ?? 'bottom'

  // Spotlight clip path
  const pad = 8
  const clipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${targetRect.left - pad}px ${targetRect.top - pad}px,
        ${targetRect.left + targetRect.width + pad}px ${targetRect.top - pad}px,
        ${targetRect.left + targetRect.width + pad}px ${targetRect.top + targetRect.height + pad}px,
        ${targetRect.left - pad}px ${targetRect.top + targetRect.height + pad}px,
        ${targetRect.left - pad}px ${targetRect.top - pad}px
      )`
    : undefined

  // Tooltip position
  const tooltipStyle: React.CSSProperties = { position: 'fixed' }
  if (targetRect) {
    const gap = 14
    const tooltipWidth = 340
    if (pos === 'bottom') {
      tooltipStyle.top = targetRect.top + targetRect.height + gap
      tooltipStyle.left = Math.min(targetRect.left, window.innerWidth - tooltipWidth - 20)
    } else if (pos === 'top') {
      tooltipStyle.bottom = window.innerHeight - targetRect.top + gap
      tooltipStyle.left = Math.min(targetRect.left, window.innerWidth - tooltipWidth - 20)
    } else if (pos === 'right') {
      tooltipStyle.top = targetRect.top
      tooltipStyle.left = targetRect.left + targetRect.width + gap
    } else {
      tooltipStyle.top = targetRect.top
      tooltipStyle.right = window.innerWidth - targetRect.left + gap
    }
  } else {
    tooltipStyle.top = '50%'
    tooltipStyle.left = '50%'
    tooltipStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <>
      {/* Overlay amb forat via clip-path */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          backgroundColor: 'rgba(0,0,0,0.55)',
          clipPath,
          opacity: visible ? 1 : 0,
          transition: 'clip-path 0.3s ease, opacity 0.3s ease',
        }}
        onClick={onClose}
      />

      {/* Spotlight ring */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-blue-400 transition-all duration-300"
          style={{
            top: targetRect.top - pad,
            left: targetRect.left - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            opacity: visible ? 1 : 0,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="z-[10000] bg-white rounded-lg shadow-xl border border-gray-200 p-3.5 transition-all duration-300"
        style={{
          ...tooltipStyle,
          width: 340,
          opacity: visible && !transitioning ? 1 : 0,
          transform: `${tooltipStyle.transform ?? ''} translateY(${visible && !transitioning ? '0' : '8px'})`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="text-xs font-semibold text-gray-900">{step.title}</h3>
          <span className="text-[10px] text-gray-400 ml-3 whitespace-nowrap">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        <div className="text-[11px] text-gray-600 leading-relaxed mb-3">
          {step.content}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-[10px] text-gray-400 hover:text-gray-600"
          >
            Saltar
          </button>
          <div className="flex gap-1.5">
            {!isFirst && (
              <button
                onClick={() => goTo(currentStep - 1)}
                className="px-2.5 py-1 text-[11px] text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Anterior
              </button>
            )}
            {isLast ? (
              <button
                onClick={onClose}
                className="px-2.5 py-1 text-[11px] text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                Acabar
              </button>
            ) : (
              <button
                onClick={() => goTo(currentStep + 1)}
                className="px-2.5 py-1 text-[11px] text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                Seguent
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
