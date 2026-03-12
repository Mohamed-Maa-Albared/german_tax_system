import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../lib/api'

interface AIHintProps {
    term: string
    label?: string
}

export default function AIHint({ term, label }: AIHintProps) {
    const [explanation, setExplanation] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (!open || explanation) return
        setLoading(true)
        api
            .get<{ term: string; explanation: string }>(`/ai/explain/${encodeURIComponent(term)}`)
            .then((r) => setExplanation(r.data.explanation))
            .catch(() => setExplanation('Unable to load explanation.'))
            .finally(() => setLoading(false))
    }, [open, term, explanation])

    return (
        <div className="inline-block">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 underline underline-offset-2"
            >
                <Sparkles size={12} />
                {label ?? `What is ${term}?`}
            </button>
            {open && (
                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 max-w-sm">
                    {loading ? 'Loading…' : explanation}
                </div>
            )}
        </div>
    )
}
