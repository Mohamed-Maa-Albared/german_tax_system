import { useState } from 'react'

export type AmountMode = 'yearly' | 'monthly'

/**
 * Returns the current input mode and a helper that converts a raw input
 * value to the annualised euro amount for storage.
 * When mode = 'monthly', toAnnual(x) = x * 12.
 * When mode = 'yearly',  toAnnual(x) = x.
 */
export function useAmountMode() {
    const [mode, setMode] = useState<AmountMode>('yearly')
    const factor = mode === 'monthly' ? 12 : 1

    function toAnnual(v: number): number {
        return Math.round(v * factor * 100) / 100
    }

    function fromAnnual(v: number): number {
        if (!v) return 0
        return mode === 'monthly' ? Math.round((v / 12) * 100) / 100 : v
    }

    return { mode, setMode, factor, toAnnual, fromAnnual }
}

interface AmountToggleProps {
    mode: AmountMode
    onChange: (m: AmountMode) => void
}

/**
 * Small pill toggle shown at the top of a wizard step.
 * Lets the user choose whether they enter monthly or annual values.
 */
export default function AmountToggle({ mode, onChange }: AmountToggleProps) {
    return (
        <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500">
                Enter amounts as
            </span>
            <div className="flex h-8 rounded-full border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-sn-surface">
                {(['yearly', 'monthly'] as AmountMode[]).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => onChange(m)}
                        className={`px-3.5 h-full text-xs font-medium transition-colors whitespace-nowrap ${mode === m
                                ? 'bg-brand-600 text-white'
                                : 'text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-600/10'
                            }`}
                    >
                        {m === 'yearly' ? 'Annual' : 'Monthly × 12'}
                    </button>
                ))}
            </div>
        </div>
    )
}
