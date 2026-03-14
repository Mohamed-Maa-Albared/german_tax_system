import { BookOpen, ChevronDown, ChevronUp, Lightbulb, MapPin } from 'lucide-react'
import { useState } from 'react'
import { lookupTerm } from '../lib/taxGlossary'

interface AIHintProps {
    term: string
    label?: string
}

/**
 * Instant in-place explanation for a German tax term.
 * Uses the pre-written glossary — no API call, no loading delay.
 * For free-form Q&A, users go to the Tax Advisor page.
 */
export default function AIHint({ term, label }: AIHintProps) {
    const [open, setOpen] = useState(false)
    const entry = lookupTerm(term)

    if (!entry) return null

    return (
        <div className="mt-1.5">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
                <BookOpen size={11} />
                {label ?? `More about ${term}`}
                {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            {open && (
                <div className="mt-1.5 rounded-lg bg-brand-50 border border-brand-100 p-3 space-y-2 text-xs max-w-sm">
                    <p className="text-gray-700 leading-relaxed">{entry.summary}</p>

                    {entry.whereToFind && (
                        <div className="flex items-start gap-1.5 pt-1 border-t border-brand-100">
                            <MapPin size={11} className="text-brand-500 mt-0.5 flex-shrink-0" />
                            <p className="text-gray-500 leading-relaxed">{entry.whereToFind}</p>
                        </div>
                    )}

                    {entry.tip && (
                        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-md p-2">
                            <Lightbulb size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-amber-800 leading-relaxed">{entry.tip}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

