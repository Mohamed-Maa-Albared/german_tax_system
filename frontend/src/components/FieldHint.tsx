import { Info } from 'lucide-react'
import { useRef, useState } from 'react'

interface FieldHintProps {
    /** Plain English explanation of what this field means */
    explanation: string
    /** Original German tax term (optional) */
    germanTerm?: string
    /** Where the user can find this value, e.g. "Look on your payslip (Lohnabrechnung)" */
    whereToFind?: string
}

const TOOLTIP_WIDTH = 288  // w-72 = 18rem = 288px

/**
 * Inline info icon that reveals a tooltip on hover/tap.
 * Uses `position: fixed` with viewport-aware placement so the tooltip is never
 * clipped by ancestor overflow-hidden containers (e.g. card accent bars).
 */
export default function FieldHint({ explanation, germanTerm, whereToFind }: FieldHintProps) {
    const [visible, setVisible] = useState(false)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const buttonRef = useRef<HTMLButtonElement>(null)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    function show() {
        if (hideTimer.current) clearTimeout(hideTimer.current)
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const vw = window.innerWidth
            const vh = window.innerHeight

            // Prefer opening to the right; flip left if it would overflow
            let left = rect.right + 6
            if (left + TOOLTIP_WIDTH > vw - 8) {
                left = Math.max(8, rect.left - TOOLTIP_WIDTH - 6)
            }

            // Prefer opening downward aligned with button top; flip up if needed
            // Estimate tooltip height generously to detect bottom overflow
            const estimatedH = 160
            let top = rect.top
            if (top + estimatedH > vh - 8) {
                top = Math.max(8, vh - estimatedH - 8)
            }

            setPos({ top, left })
        }
        setVisible(true)
    }

    function hide() {
        hideTimer.current = setTimeout(() => setVisible(false), 150)
    }

    return (
        <span className="relative inline-block ml-1 align-middle">
            <button
                ref={buttonRef}
                type="button"
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                onClick={() => (visible ? setVisible(false) : show())}
                className="text-gray-400 hover:text-brand-600 transition-colors focus:outline-none focus:text-brand-600"
                aria-label="More information"
            >
                <Info size={13} />
            </button>

            {visible && (
                <div
                    onMouseEnter={show}
                    onMouseLeave={hide}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: TOOLTIP_WIDTH }}
                    className="bg-white dark:bg-sn-surface border border-gray-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-2xl p-3 space-y-1.5 text-xs print:hidden"
                    role="tooltip"
                >
                    <p className="font-medium text-gray-800 dark:text-slate-200 leading-relaxed">{explanation}</p>
                    {germanTerm && (
                        <p className="text-gray-400 dark:text-slate-500 italic">
                            German term:{' '}
                            <span className="font-medium text-gray-500 dark:text-slate-400">{germanTerm}</span>
                        </p>
                    )}
                    {whereToFind && (
                        <div className="pt-1.5 border-t border-gray-100 dark:border-white/5">
                            <p className="text-brand-600 dark:text-brand-400 font-semibold">📄 Where to find this:</p>
                            <p className="text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{whereToFind}</p>
                        </div>
                    )}
                </div>
            )}
        </span>
    )
}
