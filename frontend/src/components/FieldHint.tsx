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

/**
 * Inline info icon that reveals a tooltip on hover/tap.
 * Use next to field labels so users can always find out what a field means
 * and where to find the number on their documents.
 */
export default function FieldHint({ explanation, germanTerm, whereToFind }: FieldHintProps) {
    const [visible, setVisible] = useState(false)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    function show() {
        if (hideTimer.current) clearTimeout(hideTimer.current)
        setVisible(true)
    }

    function hide() {
        hideTimer.current = setTimeout(() => setVisible(false), 150)
    }

    return (
        <span className="relative inline-block ml-1 align-middle">
            <button
                type="button"
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                onClick={() => setVisible((v) => !v)}
                className="text-gray-400 hover:text-brand-600 transition-colors focus:outline-none focus:text-brand-600"
                aria-label="More information"
            >
                <Info size={13} />
            </button>

            {visible && (
                <div
                    onMouseEnter={show}
                    onMouseLeave={hide}
                    className="absolute left-5 top-0 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-1.5 text-xs print:hidden"
                    role="tooltip"
                >
                    <p className="font-medium text-gray-800 leading-relaxed">{explanation}</p>
                    {germanTerm && (
                        <p className="text-gray-400 italic">
                            German term:{' '}
                            <span className="font-medium text-gray-500">{germanTerm}</span>
                        </p>
                    )}
                    {whereToFind && (
                        <div className="pt-1.5 border-t border-gray-100">
                            <p className="text-brand-600 font-semibold">📄 Where to find this:</p>
                            <p className="text-gray-500 mt-0.5 leading-relaxed">{whereToFind}</p>
                        </div>
                    )}
                </div>
            )}
        </span>
    )
}
