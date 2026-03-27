import { formatCurrency } from '@/utils/formatting'

interface MoneyCellProps {
  value: number
  highlight?: 'saving' | 'cost' | 'none'
}

export function MoneyCell({ value, highlight = 'none' }: MoneyCellProps) {
  const colorClass =
    highlight === 'saving'
      ? 'text-green-700 bg-green-50'
      : highlight === 'cost'
        ? 'text-red-700 bg-red-50'
        : ''

  return <td className={`px-2 py-1.5 text-right tabular-nums ${colorClass}`}>{formatCurrency(value)}</td>
}
