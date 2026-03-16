import { Bot, Download, Edit3, FileCode2, RefreshCw, TrendingUp, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaxBreakdownComponent from '../components/TaxBreakdown'
import { computeOpportunities } from '../lib/deductionOpportunities'
import { downloadElsterXml } from '../lib/elsterXml'
import { useTaxStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'

// ─── ELSTER XML Guide Modal ────────────────────────────────────────────────────
function ElsterGuideModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-sn-card rounded-2xl shadow-2xl dark:shadow-black/50 border border-gray-100 dark:border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <FileCode2 size={20} className="text-brand-600 dark:text-brand-400" />
                        <h2 className="font-heading font-bold text-gray-900 dark:text-slate-100 text-base">About the ELSTER XML Export</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5 space-y-4 text-sm text-gray-700 dark:text-slate-300">
                    <div className="relative overflow-hidden rounded-lg border border-brand-600/20 dark:border-brand-600/30 bg-brand-50 dark:bg-brand-600/10 p-3">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-600 rounded-l-lg" />
                        <p className="font-mono text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-1">// Reference document only</p>
                        <p className="text-xs text-brand-900 dark:text-brand-300"><strong>This file cannot be uploaded directly to ELSTER.</strong> It is a structured guide to help you fill in the official forms accurately.</p>
                    </div>

                    <section>
                        <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-1">What is it?</h3>
                        <p className="leading-relaxed">
                            The XML file contains your complete tax data organised by ELSTER <em>Anlage</em> (section).
                            Each value is annotated with the corresponding ELSTER form field number, where to find
                            the source document, and what the figure means.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">How to use it — step by step</h3>
                        <ol className="space-y-2 list-none">
                            {[
                                { n: 1, text: 'Download the file and open it in any text editor (Notepad, VS Code, TextEdit).' },
                                { n: 2, text: 'Log in to elster.de (Mein ELSTER) and open the Einkommensteuererklärung for your tax year.' },
                                { n: 3, text: 'Work through each XML section in order — each section corresponds to one ELSTER Anlage.' },
                                { n: 4, text: 'Transfer the values into ELSTER. The XML comments show the exact German field names and line numbers.' },
                                { n: 5, text: 'Cross-check the key numbers (salary, withheld tax) against your Lohnsteuerbescheinigung before submitting.' },
                                { n: 6, text: 'Submit electronically in ELSTER and wait for your Steuerbescheid (assessment, usually 4–12 weeks).' },
                            ].map(({ n, text }) => (
                                <li key={n} className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400 font-bold text-xs flex items-center justify-center">{n}</span>
                                    <span className="leading-relaxed dark:text-slate-300">{text}</span>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-1">Which ELSTER forms do I need?</h3>
                        <ul className="space-y-1 text-xs">
                            {[
                                ['Mantelbogen ESt 1 A', 'Personal details, church tax, disability — always required'],
                                ['Anlage N', 'Employment income, commute, home office, work deductions'],
                                ['Anlage S / G', 'Self-employment or business income'],
                                ['Anlage V', 'Rental income and expenses'],
                                ['Anlage KAP', 'Investment income (dividends, interest, gains)'],
                                ['Anlage Vorsorgeaufwand', 'Health/pension insurance contributions'],
                                ['Anlage Kind', 'One form per child — for Kinderfreibetrag/Kindergeld'],
                                ['Anlage Außergewöhnliche Belastungen', 'Medical costs, disability Pauschbetrag'],
                            ].map(([form, desc]) => (
                                <li key={form} className="flex gap-2 py-1 border-b border-gray-50 dark:border-white/5 last:border-0">
                                    <span className="font-medium text-gray-800 dark:text-slate-200 w-52 flex-shrink-0">{form}</span>
                                    <span className="text-gray-500 dark:text-slate-400">{desc}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                        Always verify all figures with your original source documents (Lohnsteuerbescheinigung,
                        Jahressteuerbescheide, insurance statements). For complex situations (self-employment,
                        rentals, foreign income), consult a Steuerberater or Lohnsteuerhilfeverein.
                    </p>
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Tax Twin Benchmark ────────────────────────────────────────────────────────
// Anonymised refund benchmarks from published German tax statistics (Destatis 2024).
// Shows users how their result compares to peers with similar gross income.
const TAX_TWIN_BANDS = [
    { min: 0, max: 25_000, avgRefund: 550, label: '< €25,000' },
    { min: 25_000, max: 35_000, avgRefund: 750, label: '€25k – €35k' },
    { min: 35_000, max: 50_000, avgRefund: 1_050, label: '€35k – €50k' },
    { min: 50_000, max: 70_000, avgRefund: 1_400, label: '€50k – €70k' },
    { min: 70_000, max: 100_000, avgRefund: 1_800, label: '€70k – €100k' },
    { min: 100_000, max: Infinity, avgRefund: 2_400, label: '€100k+' },
]

function TaxTwinBenchmark({ grossIncome, refundOrPayment }: { grossIncome: number; refundOrPayment: number }) {
    const band = TAX_TWIN_BANDS.find(b => grossIncome >= b.min && grossIncome < b.max)
    if (!band || refundOrPayment <= 0) return null

    const avg = band.avgRefund
    const userRefund = refundOrPayment
    const diff = userRefund - avg
    const pct = avg > 0 ? Math.round((userRefund / avg) * 100) : 100
    const isAbove = diff >= 0

    return (
        <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-brand-600 dark:text-brand-400" />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Tax Twin Benchmark</h2>
                <span className="text-xs text-gray-400 dark:text-slate-600 ml-auto">anonymous comparison</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                People with your income level ({band.label}) typically receive <strong className="text-gray-700 dark:text-slate-300">{formatCurrency(avg)}</strong> back.
            </p>
            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
                        <span className="font-mono">Typical peer refund</span>
                        <span className="font-mono font-medium text-gray-700 dark:text-slate-300">{formatCurrency(avg)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-300 dark:bg-slate-600 rounded-full transition-all duration-500" style={{ width: '60%' }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-mono text-gray-500 dark:text-slate-400">Your refund</span>
                        <span className={`font-mono font-semibold ${isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'}`}>
                            {formatCurrency(userRefund)} · {pct}% of avg
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isAbove ? 'bg-emerald-400' : 'bg-brand-500'}`}
                            style={{ width: `${Math.min(Math.round((userRefund / avg) * 60), 100)}%` }}
                        />
                    </div>
                </div>
            </div>
            <div className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${isAbove ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-400' : 'bg-brand-50 dark:bg-brand-600/10 border border-brand-200/60 dark:border-brand-600/30 text-brand-800 dark:text-brand-300'}`}>
                <span className="shrink-0 mt-0.5">{isAbove ? '✓' : '→'}</span>
                <span>{isAbove
                    ? `${formatCurrency(diff)} above the typical refund for your income group — well optimised!`
                    : `${formatCurrency(Math.abs(diff))} below the typical refund — the AI advisor may find missed deductions.`
                }</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
                Based on Destatis German income tax statistics (anonymised averages). Individual results vary by family status, deductions, and source of income.
            </p>
        </div>
    )
}

// ─── Deduction Score Panel ────────────────────────────────────────────────────
function DeductionScorePanel() {
    const { personal, employment, otherIncome, deductions, specialExpenses, result } = useTaxStore()
    const navigate = useNavigate()
    const [expanded, setExpanded] = useState(false)

    if (!result || employment.grossSalary <= 0) return null

    const summary = computeOpportunities(personal, employment, otherIncome, deductions, specialExpenses, result)
    const { deductionScore, opportunities, totalPotentialSavingMin, totalPotentialSavingMax } = summary
    const unclaimed = opportunities.filter((o) => !o.alreadyClaiming)

    const scoreColor =
        deductionScore >= 80 ? 'text-emerald-500 dark:text-emerald-400' :
            deductionScore >= 55 ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400'

    const barColor =
        deductionScore >= 80 ? 'bg-emerald-400' :
            deductionScore >= 55 ? 'bg-brand-500' : 'bg-red-400'

    return (
        <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Deduction Score</h2>
                </div>
                <div className={`text-2xl font-extrabold ${scoreColor}`}>
                    {deductionScore}<span className="text-xs text-gray-400 dark:text-slate-500 font-normal">/100</span>
                </div>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${deductionScore}%` }}
                />
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                {deductionScore >= 80
                    ? 'Well optimized — your return looks comprehensive.'
                    : unclaimed.length > 0
                        ? `${unclaimed.length} potential deduction${unclaimed.length > 1 ? 's' : ''} detected — possible saving ${formatCurrency(totalPotentialSavingMin)}–${formatCurrency(totalPotentialSavingMax)}`
                        : 'Some optimization opportunities may exist — ask the AI advisor.'}
            </p>

            {unclaimed.length > 0 && (
                <>
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium flex items-center gap-1 mb-2"
                    >
                        {expanded ? '▲ Hide' : '▼ Show'} top opportunities
                    </button>
                    {expanded && (
                        <div className="space-y-2 mb-3">
                            {unclaimed.slice(0, 3).map((opp) => (
                                <div key={opp.id} className="relative overflow-hidden flex items-start gap-2 text-xs bg-brand-50 dark:bg-brand-600/10 border border-brand-200/60 dark:border-brand-600/30 rounded-lg pl-4 pr-3 py-2">
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-600 dark:bg-brand-500 rounded-l-lg" />
                                    <span className="text-brand-500 dark:text-brand-400 shrink-0 mt-0.5">→</span>
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-slate-200">{opp.title}</p>
                                        <p className="font-mono text-brand-600 dark:text-brand-400 mt-0.5">
                                            ~{formatCurrency(opp.estimatedSavingMin)}–{formatCurrency(opp.estimatedSavingMax)} · {opp.lawRef}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <button
                onClick={() => navigate('/advisor')}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
                <Bot size={12} />
                {unclaimed.length > 0
                    ? `Open AI Advisor — find ${unclaimed.length} missed deduction${unclaimed.length > 1 ? 's' : ''}`
                    : 'Open AI Advisor for personalized advice'}
            </button>
        </div>
    )
}

export default function Results() {
    const navigate = useNavigate()
    const { result, personal, employment, reset, resultsHistory } = useTaxStore()
    const [showElsterGuide, setShowElsterGuide] = useState(false)

    if (!result) {
        navigate('/wizard')
        return null
    }

    const isRefund = result.refund_or_payment >= 0
    const comparisonRows = resultsHistory.length > 1 ? [...resultsHistory].reverse() : []

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {showElsterGuide && <ElsterGuideModal onClose={() => setShowElsterGuide(false)} />}

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading font-bold text-2xl text-gray-900 dark:text-slate-100">
                        Tax Estimate — {personal.taxYear}
                    </h1>
                    <p className="font-mono text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                        {personal.isMarried ? 'Joint filing' : 'Single'} · {formatCurrency(employment.grossSalary)} gross income
                    </p>
                </div>
                <button
                    onClick={() => navigate('/wizard')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors border border-gray-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-600/50 px-3 py-1.5 rounded-lg dark:bg-sn-card"
                >
                    <Edit3 size={14} />
                    Edit inputs
                </button>
            </div>

            {/* ── Refund / payment hero ── */}
            <div className={`relative overflow-hidden rounded-2xl px-6 py-8 text-center border ${isRefund
                ? 'bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-sn-card dark:to-sn-card border-emerald-200/80 dark:border-emerald-800/30'
                : 'bg-gradient-to-br from-red-50 via-white to-white dark:from-red-950/30 dark:via-sn-card dark:to-sn-card border-red-200/80 dark:border-red-800/30'
                }`}>
                {/* ambient glow */}
                <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full blur-3xl opacity-20 pointer-events-none ${isRefund ? 'bg-emerald-400' : 'bg-red-400'
                    }`} />
                <p className={`relative font-mono text-[10px] uppercase tracking-widest font-semibold mb-3 ${isRefund ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'
                    }`}>
                    {isRefund ? '// Estimated Tax Refund' : '// Additional Tax Due'}
                </p>
                <p className={`relative font-heading text-5xl font-extrabold ${isRefund ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                    {isRefund ? '+' : '−'}{formatCurrency(Math.abs(result.refund_or_payment))}
                </p>
                <div className={`relative w-10 h-0.5 mx-auto my-4 rounded-full ${isRefund ? 'bg-emerald-300 dark:bg-emerald-700/60' : 'bg-red-300 dark:bg-red-700/60'
                    }`} />
                <p className={`relative text-sm ${isRefund ? 'text-emerald-700 dark:text-emerald-500/80' : 'text-red-700 dark:text-red-500/80'
                    }`}>
                    {isRefund
                        ? 'Overpaid via payroll withholding — claim it back by filing your Steuererklärung'
                        : 'You owe this after payroll deductions — file by the mandatory deadline to avoid penalties'
                    }
                </p>
                {/* Key numbers strip */}
                <div className={`relative flex justify-center gap-6 mt-5 pt-4 border-t ${isRefund ? 'border-emerald-200/60 dark:border-emerald-800/20' : 'border-red-200/60 dark:border-red-800/20'
                    }`}>
                    {([
                        { label: 'Income Tax', value: result.tarifliche_est },
                        { label: 'Total Tax', value: result.total_tax },
                        { label: 'Effective Rate', value: null, rate: result.effective_rate },
                    ] as { label: string; value: number | null; rate?: number }[]).map(({ label, value, rate }, i, arr) => (
                        <>
                            <div key={label} className="text-center">
                                <p className="font-mono text-[9px] uppercase tracking-widest text-gray-400 dark:text-slate-600 mb-0.5">{label}</p>
                                <p className={`font-heading text-sm font-bold ${isRefund ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                                    }`}>
                                    {rate !== undefined
                                        ? `${(rate * 100).toFixed(1)}%`
                                        : formatCurrency(value ?? 0)}
                                </p>
                            </div>
                            {i < arr.length - 1 && (
                                <div key={`sep-${i}`} className={`w-px self-stretch ${isRefund ? 'bg-emerald-200/40 dark:bg-emerald-800/20' : 'bg-red-200/40 dark:bg-red-800/20'
                                    }`} />
                            )}
                        </>
                    ))}
                </div>
            </div>

            {/* ── Beamte / Lehrer info banner ── */}
            {personal.occupationType === 'teacher_civil_servant' && (
                <div className="relative overflow-hidden rounded-2xl border border-sn-cyan/30 dark:border-sn-cyan/20 bg-cyan-50/60 dark:bg-cyan-950/20 p-5">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-sn-cyan rounded-l-2xl" />
                    <div className="pl-2">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-sn-cyan mb-1">
                            // Beamte / Lehrer — Income Tax
                        </p>
                        <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-200 mb-1">
                            Same income tax rate is correct — §32a EStG applies equally to everyone
                        </p>
                        <p className="text-xs text-cyan-800 dark:text-cyan-300/80 leading-relaxed">
                            Civil servants and teachers pay the <strong>exact same progressive income tax</strong> as regular
                            employees under §32a EStG. Your financial advantage lies elsewhere: Beamte typically
                            save <strong>€6,000–€10,000/year</strong> in statutory social insurance contributions
                            (statutory health, pension, unemployment) — costs you simply don't have. That's your real net benefit.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Tax breakdown (chart + details) ── */}
            <TaxBreakdownComponent breakdown={result} />

            {/* ── Tax Twin benchmark ── */}
            <TaxTwinBenchmark grossIncome={result.gross_income} refundOrPayment={result.refund_or_payment} />

            {/* ── Deduction Score ── */}
            <DeductionScorePanel />

            {/* ── Multi-year comparison ── */}
            {comparisonRows.length > 1 && (
                <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">// Multi-year</p>
                            <h2 className="font-heading font-semibold text-gray-800 dark:text-slate-200">Year-over-Year Comparison</h2>
                        </div>
                        <button
                            onClick={() => navigate('/wizard')}
                            className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors"
                        >
                            + Add year
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-50 dark:border-white/3">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-50/60 dark:bg-white/3 border-b border-gray-100 dark:border-white/5">
                                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 font-normal">Year</th>
                                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 text-right font-normal">Gross</th>
                                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 text-right font-normal">ZVE</th>
                                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 text-right font-normal">Income Tax</th>
                                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 text-right font-normal">Total Tax</th>
                                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 text-right font-normal">Refund / Due</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/3">
                                {comparisonRows.map((r) => {
                                    const rop = r.refund_or_payment
                                    const isCurrent = r.tax_year === result.tax_year
                                    return (
                                        <tr key={r.tax_year} className={isCurrent
                                            ? 'bg-brand-50/60 dark:bg-brand-600/10'
                                            : 'hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors'
                                        }>
                                            <td className="px-4 py-2.5">
                                                <span className={`font-heading font-bold text-sm ${isCurrent ? 'text-brand-700 dark:text-brand-400' : 'text-gray-800 dark:text-slate-200'}`}>
                                                    {r.tax_year}
                                                </span>
                                                {isCurrent && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-widest text-brand-500 dark:text-brand-400">current</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500 dark:text-slate-400">{formatCurrency(r.gross_income)}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500 dark:text-slate-400">{formatCurrency(r.zve)}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500 dark:text-slate-400">{formatCurrency(r.tarifliche_est)}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-xs font-medium text-gray-700 dark:text-slate-300">{formatCurrency(r.total_tax)}</td>
                                            <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${rop >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {rop >= 0 ? '+' : ''}{formatCurrency(rop)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Next Steps ── */}
            <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                <h2 className="font-mono text-xs uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-4">// What do you want to do next?</h2>

                {/* Primary actions */}
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={() => navigate('/filing')}
                        className="flex items-start gap-3 p-4 rounded-xl border-2 border-brand-200 dark:border-brand-600/30 bg-brand-50 dark:bg-brand-600/10 hover:bg-brand-100 dark:hover:bg-brand-600/20 hover:border-brand-400 dark:hover:border-brand-600/50 transition-colors text-left group"
                    >
                        <span className="text-2xl mt-0.5">📄</span>
                        <div>
                            <p className="font-heading font-semibold text-brand-800 dark:text-brand-400 group-hover:text-brand-900 text-sm">Get Filing Package</p>
                            <p className="text-xs text-brand-600 dark:text-brand-500 mt-0.5 leading-relaxed">
                                ELSTER step-by-step guide + PDF export + filing timeline
                            </p>
                        </div>
                    </button>
                    <button
                        onClick={() => navigate('/advisor')}
                        className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-sn-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800/50 transition-colors text-left group"
                    >
                        <Bot size={22} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-heading font-semibold text-gray-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 text-sm">Maximize My Refund</p>
                            <p className="text-xs text-gray-500 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-500 mt-0.5 leading-relaxed">
                                AI advisor spots missed deductions and updates your calculation
                            </p>
                        </div>
                    </button>
                </div>

                {/* Secondary actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                    <button
                        onClick={() => downloadElsterXml({ personal, breakdown: result })}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 transition-colors"
                    >
                        <Download size={12} />
                        Download ELSTER XML
                    </button>
                    <button
                        onClick={() => setShowElsterGuide(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-500 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        title="What is the ELSTER XML and how do I use it?"
                    >
                        <FileCode2 size={12} />
                        What is the XML?
                    </button>
                    {comparisonRows.length > 0 && (
                        <button
                            onClick={() => navigate('/wizard')}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-500 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <TrendingUp size={12} />
                            Add another year
                        </button>
                    )}
                    <button
                        onClick={() => { reset(); navigate('/wizard') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-white/10 text-gray-400 dark:text-slate-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ml-auto"
                    >
                        <RefreshCw size={12} />
                        Start over
                    </button>
                </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-slate-600 text-center pb-2">
                This is an estimate only. Consult a Steuerberater (tax advisor) for your official filing.
                The ELSTER XML is a reference document — click "What is the XML?" to learn more.
            </p>
        </div>
    )
}
