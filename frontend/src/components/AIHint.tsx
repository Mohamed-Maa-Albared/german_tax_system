import { HelpCircle, Loader2, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { explainTerm } from '../lib/api'

interface AIHintProps {
    term: string
    label?: string
}

/**
 * Clicking the info icon fetches a plain-English explanation for a German tax term.
 * Falls back gracefully if Ollama is unavailable.
 */
export default function AIHint({ term, label }: AIHintProps) {
    const [open, setOpen] = useState(false)
    const [explanation, setExplanation] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleOpen() {
        setOpen(true)
        if (explanation) return
        setLoading(true)
        try {
            const data = await explainTerm(term)
            setExplanation(data.explanation)
        } catch {
            setExplanation(`"${term}" — an AI explanation is not available right now.`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <span className="relative inline-flex items-center">
            <button
                type="button"
                onClick={handleOpen}
                className="ml-1 text-slate-400 hover:text-brand-500 transition-colors"
                aria-label={`Explain ${term}`}
            >
                <HelpCircle size={15} />
            </button>

            {open && (
                <div className="absolute z-50 bottom-7 left-1/2 -translate-x-1/2 w-72 bg-brand-900 text-white rounded-xl p-4 shadow-xl text-sm animate-fade-in">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-accent-400 flex-shrink-0" />
                            <span className="font-semibold text-accent-300 text-xs uppercase tracking-wide">
                                {label ?? term}
                            </span>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-300">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-xs">Looking that up…</span>
                        </div>
                    ) : (
                        <p className="text-slate-200 leading-relaxed text-xs">{explanation}</p>
                    )}
                    {/* Arrow */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-brand-900" />
                </div>
            )}
        </span>
    )
}
