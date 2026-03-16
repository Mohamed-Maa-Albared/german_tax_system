import {
    AlertCircle,
    Bot,
    CheckCircle2,
    RotateCcw,
    Send,
    Sparkles,
    TrendingUp,
    User,
    X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { fetchAiStatus } from '../lib/api'
import { useTaxStore } from '../lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChangeProposal {
    field: string
    value: number
    label: string
    reason?: string          // why the advisor is suggesting this (grounded in user's words)
    saving_estimate?: string
}

interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string     // clean text (APPLY: lines stripped)
    rawContent?: string // full streamed text before stripping
    streaming?: boolean
    proposals?: ChangeProposal[]
}

// ─── Field → Store mapping ────────────────────────────────────────────────────

type StoreType = ReturnType<typeof useTaxStore.getState>

const FIELD_APPLY: Record<string, (store: StoreType, v: number) => void> = {
    home_office_days: (s, v) => s.updateDeductions({ homeOfficeDays: v }),
    commute_km: (s, v) => s.updateDeductions({ commuteKm: v }),
    commute_days: (s, v) => s.updateDeductions({ commuteDays: v }),
    work_equipment: (s, v) => s.updateDeductions({ workEquipment: v }),
    work_training: (s, v) => s.updateDeductions({ workTraining: v }),
    other_work_expenses: (s, v) => s.updateDeductions({ otherWorkExpenses: v }),
    union_fees: (s, v) => s.updateDeductions({ unionFees: v }),
    pension_contributions: (s, v) => s.updateSpecialExpenses({ pensionContributions: v }),
    health_insurance_contributions: (s, v) => s.updateSpecialExpenses({ healthInsuranceContributions: v }),
    long_term_care_insurance: (s, v) => s.updateSpecialExpenses({ longTermCareInsurance: v }),
    riester_contributions: (s, v) => s.updateSpecialExpenses({ riesterContributions: v }),
    donations: (s, v) => s.updateSpecialExpenses({ donations: v }),
    medical_costs: (s, v) => s.updateSpecialExpenses({ medicalCosts: v }),
    childcare_costs: (s, v) => s.updateSpecialExpenses({ childcareCosts: v }),
    alimony_paid: (s, v) => s.updateSpecialExpenses({ alimonyPaid: v }),
    disability_grade: (s, v) => s.updatePersonal({ disabilityGrade: v, isDisabled: v > 0 }),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

/**
 * Strip APPLY: lines from the visible text and parse them into ChangeProposal objects.
 * Case-insensitive, handles optional leading whitespace and markdown bold.
 * Called both during and after streaming.
 */
function parseResponse(raw: string): { text: string; proposals: ChangeProposal[] } {
    const proposals: ChangeProposal[] = []
    const text = raw
        // Match complete APPLY lines: case-insensitive, optional leading whitespace/markdown
        .replace(/^\s*(?:\*{0,2})APPLY:(?:\*{0,2})\s*(\{[^\n]*\})\s*$/gim, (_match, jsonStr) => {
            try {
                const p = JSON.parse(jsonStr.trim())
                if (p.field && p.value !== undefined && p.label) {
                    proposals.push({
                        field: p.field,
                        value: Number(p.value),
                        label: p.label,
                        reason: p.reason,
                        saving_estimate: p.saving_estimate,
                    })
                }
            } catch { /* ignore malformed JSON */ }
            return ''
        })
        // Hide any trailing incomplete APPLY line (still being streamed)
        .replace(/\n\s*(?:\*{0,2})APPLY:[^\n]*$/i, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    return { text, proposals }
}

function buildUserContext(store: StoreType) {
    const { personal, employment, otherIncome, deductions, specialExpenses, result } = store
    return {
        tax_year: personal.taxYear,
        is_married: personal.isMarried,
        num_children: personal.numChildren,
        is_church_member: personal.isChurchMember,
        is_disabled: personal.isDisabled,
        disability_grade: personal.disabilityGrade ?? 0,
        gross_salary: employment.grossSalary,
        bonus: employment.bonusType === 'fixed'
            ? employment.bonus
            : Math.round((employment.grossSalary * (employment.bonusPercent ?? 0)) / 100),
        self_employed_revenue: otherIncome.selfEmployedRevenue - otherIncome.selfEmployedExpenses,
        rental_income: otherIncome.rentalIncome - otherIncome.rentalExpenses,
        dividends: otherIncome.dividends,
        capital_gains: otherIncome.capitalGains,
        // Deductions
        commute_km: deductions.commuteKm,
        commute_days: deductions.commuteDays,
        home_office_days: deductions.homeOfficeDays,
        work_equipment: deductions.workEquipment ?? 0,
        work_training: deductions.workTraining ?? 0,
        other_work_expenses: deductions.otherWorkExpenses,
        union_fees: deductions.unionFees ?? 0,
        loss_carry_forward: deductions.lossCarryForward ?? 0,
        // Special expenses
        pension_contributions: specialExpenses.pensionContributions,
        health_insurance_contributions: specialExpenses.healthInsuranceContributions,
        long_term_care_insurance: specialExpenses.longTermCareInsurance ?? 0,
        riester_contributions: specialExpenses.riesterContributions,
        donations: specialExpenses.donations,
        medical_costs: specialExpenses.medicalCosts ?? 0,
        childcare_costs: specialExpenses.childcareCosts,
        alimony_paid: specialExpenses.alimonyPaid,
        church_fees_paid: specialExpenses.churchTaxPriorYear ?? 0,
        // Results
        zve: result?.zve,
        total_tax: result?.total_tax,
        refund_or_payment: result?.refund_or_payment,
        tarifliche_est: result?.tarifliche_est,
        werbungskosten_used: result?.werbungskosten_used,
    }
}

function buildSuggestedQuestions(store: StoreType): string[] {
    const { personal, employment, deductions, specialExpenses, result } = store
    const questions: string[] = []

    if (result) {
        const refund = result.refund_or_payment
        if (refund < 0) {
            questions.push(`Why do I owe an extra ${fmt(Math.abs(refund))}? How can I reduce it?`)
        } else {
            questions.push(`Can I increase my refund beyond ${fmt(refund)}?`)
        }
    }

    if (deductions.homeOfficeDays === 0) {
        questions.push('Can I claim a home office deduction (Homeoffice-Pauschale)?')
    } else if (deductions.homeOfficeDays < 210) {
        questions.push(`I currently have ${deductions.homeOfficeDays} home office days — should I increase this?`)
    }

    if ((deductions.workEquipment ?? 0) === 0 && employment.grossSalary > 0) {
        questions.push('What work equipment can I deduct as Werbungskosten?')
    }

    if (specialExpenses.healthInsuranceContributions === 0 && employment.grossSalary > 0) {
        questions.push('How do I deduct my health insurance premiums?')
    }

    if (deductions.commuteKm > 0) {
        questions.push(`How does the Pendlerpauschale work for my ${deductions.commuteKm} km commute?`)
    }

    if (specialExpenses.pensionContributions === 0) {
        questions.push('Should I contribute to a Riester or Rürup pension to save on taxes?')
    }

    if (personal.isMarried) {
        questions.push('Is Zusammenveranlagung (joint filing) always better for us?')
    }

    if (personal.numChildren > 0 && (specialExpenses.childcareCosts ?? 0) === 0) {
        questions.push('Can I deduct childcare costs? What is the Kinderbetreuungskosten deduction?')
    }

    questions.push('What are the most commonly missed deductions in Germany?')
    questions.push('What receipts and documents do I need to keep?')

    return questions.slice(0, 6)
}

export default function TaxAdvisor() {
    const store = useTaxStore()
    const { personal, employment, result } = store
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [modelName, setModelName] = useState<string>('local')
    // Track which proposals the user has dismissed or already applied
    const [dismissedProposals, setDismissedProposals] = useState<Set<string>>(new Set())
    const [appliedProposals, setAppliedProposals] = useState<Set<string>>(new Set())
    const nextId = useRef(1)
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const hasData = employment.grossSalary > 0
    const suggestedQuestions = buildSuggestedQuestions(store)

    useEffect(() => {
        fetchAiStatus()
            .then((s) => setModelName(s.model))
            .catch(() => setModelName('local'))
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function sendMessage(text: string) {
        if (!text.trim() || loading) return
        setError(null)

        const userMsg: Message = { id: nextId.current++, role: 'user', content: text.trim() }
        const assistantId = nextId.current++
        const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true }

        setMessages((prev) => [...prev, userMsg, assistantMsg])
        setInput('')
        setLoading(true)

        const userContext = buildUserContext(store)
        const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history, user_context: userContext }),
            })

            if (!res.ok || !res.body) {
                throw new Error(`Server error: ${res.status}`)
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let rawAccumulated = ''

            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                rawAccumulated += decoder.decode(value, { stream: true })
                // Strip APPLY: lines live during streaming so they never flash to user
                const { text: cleanText } = parseResponse(rawAccumulated)
                setMessages((prev) =>
                    prev.map((m) => m.id === assistantId ? { ...m, content: cleanText } : m),
                )
            }

            // After streaming: do final parse to extract change proposals
            const { text: finalText, proposals } = parseResponse(rawAccumulated)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: finalText, rawContent: rawAccumulated, proposals, streaming: false }
                        : m,
                ),
            )
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error'
            setError(errMsg)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: '⚠️ Failed to get a response. Is Ollama running?', streaming: false }
                        : m,
                ),
            )
        } finally {
            setLoading(false)
            textareaRef.current?.focus()
        }
    }

    function handleAcceptProposal(msgId: number, idx: number, proposal: ChangeProposal) {
        const key = `${msgId}-${idx}`
        const applyFn = FIELD_APPLY[proposal.field]
        if (applyFn) {
            applyFn(store, proposal.value)
            store.runCalculation()
        }
        setAppliedProposals((prev) => new Set([...prev, key]))
    }

    function handleDismissProposal(msgId: number, idx: number) {
        setDismissedProposals((prev) => new Set([...prev, `${msgId}-${idx}`]))
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    function clearChat() {
        setMessages([])
        setError(null)
        setDismissedProposals(new Set())
        setAppliedProposals(new Set())
        nextId.current = 1
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] min-h-[600px]">
            {/* ── Sidebar ── */}
            <aside className="lg:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto pb-2">
                {/* Advisor card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-brand-600" />
                        AI Tax Advisor
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Ask anything about your German taxes. The advisor sees your numbers, spots missed deductions,
                        and can update your inputs directly.
                    </p>
                    {hasData && messages.length === 0 && (
                        <button
                            onClick={() => sendMessage(
                                'Please analyze my complete tax situation. For each deduction I currently have at €0 or missing, ' +
                                'explain: (1) what it is, (2) roughly how much someone in my situation might save, and (3) what ' +
                                'information I would need to provide to claim it. ' +
                                'Do NOT assume specific amounts — just explain the opportunities so I can tell you which ones apply to me.'
                            )}
                            disabled={loading}
                            className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                        >
                            <TrendingUp size={14} />
                            Analyze my taxes for max refund
                        </button>
                    )}
                </div>

                {/* Tax snapshot */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Your Tax Snapshot
                    </h3>
                    {hasData ? (
                        <div className="space-y-2 text-sm">
                            <Row label="Tax year" value={String(personal.taxYear)} />
                            <Row label="Filing status" value={personal.isMarried ? 'Joint' : 'Single'} />
                            {personal.numChildren > 0 && (
                                <Row label="Children" value={String(personal.numChildren)} />
                            )}
                            <Row label="Gross salary" value={fmt(employment.grossSalary)} />
                            {result && (
                                <>
                                    <div className="border-t border-gray-100 my-2" />
                                    <Row label="Taxable income (ZVE)" value={fmt(result.zve)} />
                                    <Row label="Total tax" value={fmt(result.total_tax)} />
                                    <div
                                        className={`flex justify-between font-semibold ${result.refund_or_payment >= 0 ? 'text-green-700' : 'text-red-600'}`}
                                    >
                                        <span>{result.refund_or_payment >= 0 ? 'Estimated refund' : 'Amount owed'}</span>
                                        <span>{fmt(Math.abs(result.refund_or_payment))}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-500 mb-3">
                                Run the calculator first so the advisor knows your numbers.
                            </p>
                            <Link
                                to="/wizard"
                                className="inline-block text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                Start Tax Calculator
                            </Link>
                        </div>
                    )}
                </div>

                {/* Suggested questions — always visible */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        {messages.length === 0 ? 'Try asking…' : 'Quick questions'}
                    </h3>
                    <div className="space-y-2">
                        {suggestedQuestions.map((q) => (
                            <button
                                key={q}
                                onClick={() => sendMessage(q)}
                                disabled={loading}
                                className="w-full text-left text-sm text-brand-700 hover:bg-brand-50 px-3 py-2 rounded-lg transition-colors border border-brand-100 hover:border-brand-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* ── Main: Chat Area ── */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Bot size={18} className="text-brand-600" />
                        <span className="font-medium text-gray-700">SmartTax AI Advisor</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {modelName} · local
                        </span>
                    </div>
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <RotateCcw size={12} />
                            New chat
                        </button>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 select-none">
                            <Bot size={48} className="mb-4 text-gray-200" />
                            <p className="text-base font-medium text-gray-500">Your personal tax optimization advisor</p>
                            <p className="text-sm mt-1 max-w-sm">
                                {hasData
                                    ? 'I can see your tax data. Click "Analyze my taxes" in the sidebar or ask a question to get started.'
                                    : 'Run the calculator first, then come back for personalised advice and refund optimization.'}
                            </p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className="space-y-2">
                            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div
                                    className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-brand-600' : 'bg-gray-100'}`}
                                >
                                    {msg.role === 'user' ? (
                                        <User size={14} className="text-white" />
                                    ) : (
                                        <Bot size={14} className="text-gray-500" />
                                    )}
                                </div>
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-tr-none whitespace-pre-wrap'
                                        : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-none prose prose-sm prose-brand max-w-none'
                                        }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content || ' '}
                                            </ReactMarkdown>
                                            {msg.streaming && (
                                                <span className="inline-block w-1 h-4 ml-0.5 bg-gray-400 animate-pulse align-text-bottom" />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {msg.content}
                                            {msg.streaming && (
                                                <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse align-text-bottom" />
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Change proposal cards */}
                            {msg.role === 'assistant' && !msg.streaming && msg.proposals && msg.proposals.length > 0 && (
                                <div className="ml-11 space-y-2">
                                    {msg.proposals.map((proposal, idx) => {
                                        const key = `${msg.id}-${idx}`
                                        const isApplied = appliedProposals.has(key)
                                        const isDismissed = dismissedProposals.has(key)
                                        if (isDismissed) return null
                                        return (
                                            <div
                                                key={key}
                                                className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${isApplied
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-amber-50 border-amber-200'
                                                    }`}
                                            >
                                                <div className="shrink-0 mt-0.5">
                                                    {isApplied
                                                        ? <CheckCircle2 size={16} className="text-green-600" />
                                                        : <TrendingUp size={16} className="text-amber-600" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium ${isApplied ? 'text-green-800' : 'text-amber-800'}`}>
                                                        {isApplied
                                                            ? `✓ ${proposal.label} updated in calculator`
                                                            : `Update: ${proposal.label} → ${proposal.value}`
                                                        }
                                                    </p>
                                                    {proposal.reason && !isApplied && (
                                                        <p className="text-xs text-amber-700 mt-0.5 italic">
                                                            Why: {proposal.reason}
                                                        </p>
                                                    )}
                                                    {proposal.saving_estimate && !isApplied && (
                                                        <p className="text-amber-600 text-xs mt-0.5">
                                                            Estimated saving: {proposal.saving_estimate}
                                                        </p>
                                                    )}
                                                    {isApplied && result && (
                                                        <p className="text-green-600 text-xs mt-0.5">
                                                            New refund estimate: {result.refund_or_payment >= 0 ? '+' : ''}{fmt(result.refund_or_payment)}
                                                            {proposal.saving_estimate && ` (${proposal.saving_estimate} saved)`}
                                                        </p>
                                                    )}
                                                </div>
                                                {!isApplied && (
                                                    <div className="shrink-0 flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleAcceptProposal(msg.id, idx, proposal)}
                                                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            Apply
                                                        </button>
                                                        <button
                                                            onClick={() => handleDismissProposal(msg.id, idx)}
                                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                                            title="Not relevant to me"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-100 px-4 py-3">
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={textareaRef}
                            rows={2}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            placeholder="Ask about your taxes… (Enter to send, Shift+Enter for new line)"
                            className="flex-1 resize-none rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 disabled:opacity-50 transition"
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={loading || !input.trim()}
                            className="shrink-0 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl px-4 py-2.5 transition-colors flex items-center gap-1.5"
                        >
                            <Send size={14} />
                            <span className="text-sm font-medium">Send</span>
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 px-1">
                        Answers are generated by a local AI model and are for guidance only. Always verify with a Steuerberater for legal matters.
                    </p>
                </div>
            </div>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-gray-600">
            <span className="text-gray-400">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    )
}
