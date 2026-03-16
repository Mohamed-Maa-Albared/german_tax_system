/**
 * CapIndicator — real-time deduction cap usage bar.
 *
 * Shows how much of a legal cap has been used with a colour-coded progress
 * bar and a concise "X / Y max" label. Turns amber near the limit, red when
 * exceeded (which may mean the value is outside the deductible range).
 */

interface Props {
    /** Current value entered by the user (in the same unit as max). */
    current: number
    /** Maximum deductible amount or maximum allowed days. */
    max: number
    /** Short description shown on the left side of the bar. */
    label: string
    /** Unit for display. Use '€' for money, 'days' for day counts. */
    unit?: '€' | 'days'
}

function fmt(value: number, unit: '€' | 'days'): string {
    if (unit === '€') {
        return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    }
    return `${value} day${value !== 1 ? 's' : ''}`
}

export default function CapIndicator({ current, max, label, unit = '€' }: Props) {
    if (current <= 0 || max <= 0) return null

    const pct = Math.min(100, Math.round((current / max) * 100))
    const isAtCap = pct >= 100
    const isNearCap = pct >= 90 && !isAtCap

    const barClass = isAtCap
        ? 'bg-brand-600'
        : isNearCap
            ? 'bg-brand-400'
            : 'bg-brand-400'

    const textClass = isAtCap
        ? 'text-brand-600 dark:text-brand-400'
        : isNearCap
            ? 'text-brand-500 dark:text-brand-400'
            : 'text-gray-400 dark:text-slate-500'

    return (
        <div className="mt-1.5">
            <div className={`flex justify-between text-xs mb-0.5 font-mono ${textClass}`}>
                <span>{label}</span>
                <span>
                    {fmt(current, unit)} / {fmt(max, unit)}
                    {isAtCap && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] uppercase tracking-widest font-semibold text-brand-600 dark:text-brand-400">
                            · cap reached
                        </span>
                    )}
                </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${barClass}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}
