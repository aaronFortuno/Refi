import { useState, type ReactNode } from 'react'

interface CollapsibleProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  badge?: string
  dataTour?: string
}

export function Collapsible({ title, defaultOpen = true, children, badge, dataTour }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-lg border" data-tour={dataTour}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>&#9654;</span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{badge}</span>
          )}
        </div>
      </button>
      {open && <div className="px-4 pb-4" data-tour-content>{children}</div>}
    </div>
  )
}
