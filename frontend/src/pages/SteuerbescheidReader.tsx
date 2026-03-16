/**
 * Steuerbescheid Reader — SmartTax Germany
 *
 * Allows users to input key figures from their Finanzamt Steuerbescheid
 * (tax assessment letter) and compare them against the SmartTax calculation.
 * Flags discrepancies and explains Einspruch (objection) options.
 *
 * Architecture note: This page deliberately uses manual input rather than
 * OCR/PDF parsing — OCR requires a server-side pipeline. The typed-entry
 * approach gives full offline privacy and can be enhanced with OCR later.
 */

import {
    AlertCircle,
    AlertTriangle,
    ArrowRightLeft,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileText,
    HelpCircle,
    Info,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaxStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BescheidValues {
    taxableIncome: string     // ZVE / "zu versteuerndes Einkommen" — Zeile 50–55
    incomeTax: string         // festzusetzende Einkommensteuer — Zeile 100
    solidaritaetszuschlag: string  // Solidaritätszuschlag — Zeile 105
    kirchensteuer: string     // Kirchensteuer — Zeile 110
    refundOrPayment: string   // Nachzahlung (−) / Erstattung (+) — bottom of notice
    assessmentDate: string    // Datum des Bescheids
}

interface DiscrepancyItem {
    label: string
    ourValue: number
    theirValue: number
    diff: number
    severity: 'ok' | 'minor' | 'significant' | 'major'
    explanation: string
    einspruchHint?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEuro(s: string): number {
    const trimmed = s.replace(/\s/g, '')
    // German format: "1.234,56" or "1.234" — has comma as decimal separator
    // English format: "1234.56" — dot as decimal separator, no thousands comma
    // Distinguish: if the string contains a comma, it's German format.
    let normalised: string
    if (trimmed.includes(',')) {
        // German: remove thousands dots, convert decimal comma to dot
        normalised = trimmed.replace(/\./g, '').replace(',', '.')
    } else {
        // English or plain integer: use as-is
        normalised = trimmed
    }
    const n = parseFloat(normalised)
    return isNaN(n) ? 0 : n
}

function getSeverity(diff: number, base: number): DiscrepancyItem['severity'] {
    if (base === 0) return 'ok'
    const pct = Math.abs(diff) / Math.max(base, 1)
    if (Math.abs(diff) < 5) return 'ok'
    if (pct < 0.01) return 'minor'
    if (pct < 0.05) return 'significant'
    return 'major'
}

function computeDiscrepancies(
    bescheid: BescheidValues,
    ourResult: ReturnType<typeof useTaxStore.getState>['result'],
): DiscrepancyItem[] {
    if (!ourResult) return []
    const items: DiscrepancyItem[] = []

    const theirZVE = parseEuro(bescheid.taxableIncome)
    if (theirZVE > 0) {
        const diff = theirZVE - ourResult.zve
        items.push({
            label: 'Taxable Income (ZVE)',
            ourValue: ourResult.zve,
            theirValue: theirZVE,
            diff,
            severity: getSeverity(diff, ourResult.zve),
            explanation: diff > 0
                ? 'The Finanzamt calculated a higher taxable income than we did. This typically means some deductions were disallowed or additional income was included.'
                : diff < 0
                    ? 'The Finanzamt calculated a lower taxable income — this is beneficial. Usually means they applied a deduction you may have missed.'
                    : 'Taxable income matches — good sign.',
            einspruchHint: Math.abs(diff) > 100
                ? 'Request a detailed Erläuterungen (explanatory notes) from the Finanzamt to understand which deductions were changed.'
                : undefined,
        })
    }

    const theirTax = parseEuro(bescheid.incomeTax)
    if (theirTax > 0) {
        const diff = theirTax - ourResult.tarifliche_est
        items.push({
            label: 'Income Tax (Einkommensteuer)',
            ourValue: ourResult.tarifliche_est,
            theirValue: theirTax,
            diff,
            severity: getSeverity(diff, ourResult.tarifliche_est),
            explanation: diff > 0
                ? 'Finanzamt charged more income tax. Usually follows from a higher ZVE — investigate the ZVE discrepancy first.'
                : diff < 0
                    ? 'Finanzamt charged less — may mean a deduction was applied that our calculator did not have.'
                    : 'Income tax matches.',
            einspruchHint: Math.abs(diff) > 50
                ? 'If ZVE matches but tax differs by >€50, there may be a rounding or coefficient error — compare the Anlage N or Einkommensteuerbescheid Berechnungsschema.'
                : undefined,
        })
    }

    const theirSoli = parseEuro(bescheid.solidaritaetszuschlag)
    if (theirSoli > 0 || ourResult.solidaritaetszuschlag > 0) {
        const diff = theirSoli - ourResult.solidaritaetszuschlag
        items.push({
            label: 'Solidarity Surcharge (Soli)',
            ourValue: ourResult.solidaritaetszuschlag,
            theirValue: theirSoli,
            diff,
            severity: getSeverity(diff, ourResult.solidaritaetszuschlag),
            explanation: 'Soli is 5.5% of income tax, with a zero band below €20,350 (single) / €40,700 (joint). If one of you is zero and the other is not, the most common cause is a difference in calculated income tax.',
            einspruchHint: Math.abs(diff) > 10 ? 'Check whether your income tax base exactly matches — Soli is a fixed formula.' : undefined,
        })
    }

    const theirRefund = parseEuro(bescheid.refundOrPayment)
    if (bescheid.refundOrPayment.trim() !== '') {
        const diff = theirRefund - ourResult.refund_or_payment
        items.push({
            label: 'Refund / Additional Payment',
            ourValue: ourResult.refund_or_payment,
            theirValue: theirRefund,
            diff,
            severity: getSeverity(diff, Math.abs(ourResult.refund_or_payment)),
            explanation: diff > 0
                ? 'You are getting back more than expected — good news!'
                : diff < 0
                    ? 'You are getting less back (or paying more) than our estimate. Investigate the ZVE and tax discrepancies above.'
                    : 'Refund/payment matches estimate.',
            einspruchHint: diff < -200
                ? 'If you are receiving significantly less than expected, raise an Einspruch within 30 days of the Bescheid date. Cite the specific Zeile and your evidence.'
                : undefined,
        })
    }

    return items
}

// ─── Field input ─────────────────────────────────────────────────────────────

function DeschedField({
    label,
    value,
    onChange,
    hint,
    zeile,
    placeholder = '0,00',
}: {
    label: string
    value: string
    onChange: (v: string) => void
    hint: string
    zeile: string
    placeholder?: string
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                <span className="ml-2 text-xs font-normal text-gray-400">{zeile}</span>
            </label>
            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 px-3 py-2 text-sm outline-none transition"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">€</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{hint}</p>
        </div>
    )
}

// ─── Discrepancy row ──────────────────────────────────────────────────────────

function DiscrepancyRow({ item }: { item: DiscrepancyItem }) {
    const [open, setOpen] = useState(false)
    const isOk = item.severity === 'ok'
    const colorClass =
        item.severity === 'major' ? 'border-red-300 bg-red-50' :
            item.severity === 'significant' ? 'border-amber-300 bg-amber-50' :
                item.severity === 'minor' ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'

    const Icon = isOk ? CheckCircle2 : item.severity === 'major' ? AlertTriangle : AlertCircle
    const iconColor = isOk ? 'text-green-500' : item.severity === 'major' ? 'text-red-500' : 'text-amber-500'

    return (
        <div className={`rounded-xl border p-4 ${colorClass}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                    <Icon size={16} className={`shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{item.label}</p>
                        <div className="flex gap-4 mt-1 text-xs text-gray-600">
                            <span>Our estimate: <strong className="text-gray-800">{formatCurrency(item.ourValue)}</strong></span>
                            <span>Finanzamt: <strong className="text-gray-800">{formatCurrency(item.theirValue)}</strong></span>
                        </div>
                        {!isOk && (
                            <p className={`text-xs font-semibold mt-1 ${item.diff > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                Difference: {item.diff > 0 ? '▲ +' : '▼ '}{formatCurrency(Math.abs(item.diff))}
                                {item.diff > 0 ? ' (Finanzamt charged/assessed more)' : ' (Finanzamt was lower — may be in your favour)'}
                            </p>
                        )}
                        {isOk && <p className="text-xs text-green-600 mt-1">✓ Values match</p>}
                    </div>
                </div>
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="shrink-0 text-gray-400 hover:text-gray-600 p-1"
                    title={open ? 'Collapse' : 'Explain'}
                >
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {open && (
                <div className="mt-3 pl-6 space-y-2 text-xs text-gray-600 border-t border-current border-opacity-20 pt-2">
                    <p>{item.explanation}</p>
                    {item.einspruchHint && (
                        <div className="bg-white rounded-lg p-2.5 border border-amber-300">
                            <p className="font-semibold text-amber-700 mb-0.5 flex items-center gap-1">
                                <Info size={11} /> Einspruch (objection) note:
                            </p>
                            <p className="text-amber-800">{item.einspruchHint}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SteuerbescheidReader() {
    const navigate = useNavigate()
    const { result } = useTaxStore()

    const [values, setValues] = useState<BescheidValues>({
        taxableIncome: '',
        incomeTax: '',
        solidaritaetszuschlag: '',
        kirchensteuer: '',
        refundOrPayment: '',
        assessmentDate: '',
    })
    const [submitted, setSubmitted] = useState(false)
    const [showEinspruchGuide, setShowEinspruchGuide] = useState(false)

    function update(field: keyof BescheidValues) {
        return (v: string) => setValues((prev) => ({ ...prev, [field]: v }))
    }

    const hasAnyValue = Object.values(values).some((v) => v.trim() !== '')

    const discrepancies = submitted ? computeDiscrepancies(values, result) : []
    const hasIssues = discrepancies.some((d) => d.severity !== 'ok')
    const hasMajorIssue = discrepancies.some((d) => d.severity === 'major')

    // Deadline: 30 days from Bescheid date
    const einspruchDeadline = values.assessmentDate
        ? (() => {
            const d = new Date(values.assessmentDate)
            d.setDate(d.getDate() + 30)
            return d.toLocaleDateString('en-DE', { day: '2-digit', month: 'long', year: 'numeric' })
        })()
        : null

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* ── Header ── */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <FileText size={22} className="text-brand-600" />
                    <h1 className="font-heading font-bold text-2xl text-gray-900 dark:text-slate-100">Steuerbescheid Reader</h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Enter the key figures from your Finanzamt tax assessment letter to check for discrepancies
                    and understand your options.
                </p>
            </div>

            {/* ── No result warning ── */}
            {!result && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Run the calculator first</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            For a meaningful comparison, complete the Tax Wizard so we have your numbers to compare against.
                        </p>
                        <button
                            onClick={() => navigate('/wizard')}
                            className="mt-2 text-xs font-medium bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                        >
                            Go to Tax Calculator
                        </button>
                    </div>
                </div>
            )}

            {/* ── What is a Steuerbescheid ── */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold flex items-center gap-1 mb-1">
                    <HelpCircle size={14} /> What is a Steuerbescheid?
                </p>
                <p className="text-xs leading-relaxed text-blue-700">
                    After you file your Steuererklärung, the Finanzamt (tax office) sends you a <strong>Steuerbescheid</strong> —
                    an official tax assessment letter. It shows their calculation of your taxable income, tax due,
                    and whether you receive a refund or owe additional tax. You have <strong>30 days</strong> to
                    raise an <strong>Einspruch (formal objection)</strong> if you disagree with any figure.
                </p>
            </div>

            {/* ── Bescheid date + deadline ── */}
            <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Step 1 — Assessment Date</h2>
                <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date on the Steuerbescheid letter
                        <span className="ml-2 text-xs font-normal text-gray-400">(Datum des Bescheids)</span>
                    </label>
                    <input
                        type="date"
                        value={values.assessmentDate}
                        onChange={(e) => update('assessmentDate')(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 px-3 py-2 text-sm outline-none transition"
                    />
                    {einspruchDeadline && (
                        <p className={`text-sm font-semibold mt-2 ${new Date(values.assessmentDate) > new Date(Date.now() - 28 * 86400000)
                            ? 'text-green-700'
                            : 'text-red-600'
                            }`}>
                            ⏰ Einspruch deadline: <strong>{einspruchDeadline}</strong>
                        </p>
                    )}
                </div>
            </div>

            {/* ── Key figures input ── */}
            <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Step 2 — Key Figures from Your Bescheid</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    <DeschedField
                        label="Taxable Income (ZVE)"
                        value={values.taxableIncome}
                        onChange={update('taxableIncome')}
                        zeile="Zeile 50–55"
                        hint="The 'zu versteuerndes Einkommen' — also labelled 'zvE' in the Berechnungsschema section"
                    />
                    <DeschedField
                        label="Income Tax (Einkommensteuer)"
                        value={values.incomeTax}
                        onChange={update('incomeTax')}
                        zeile="Zeile 100 / festzus. ESt"
                        hint="The 'festzusetzende Einkommensteuer' before Soli/KiSt additions"
                    />
                    <DeschedField
                        label="Solidarity Surcharge (Soli)"
                        value={values.solidaritaetszuschlag}
                        onChange={update('solidaritaetszuschlag')}
                        zeile="Zeile 105"
                        hint="May be 0 if your income tax is below the Freigrenze (most employees)"
                    />
                    <DeschedField
                        label="Church Tax (Kirchensteuer)"
                        value={values.kirchensteuer}
                        onChange={update('kirchensteuer')}
                        zeile="Zeile 110"
                        hint="Only applies if you are registered as a member of a church"
                    />
                    <DeschedField
                        label="Refund (+) or Payment due (−)"
                        value={values.refundOrPayment}
                        onChange={update('refundOrPayment')}
                        zeile="Zahlungsaufforderung / Erstattung"
                        hint="Enter negative (−) if you owe money, positive (+) if you are getting a refund. Use the sign as printed."
                        placeholder="e.g. 1.234,50 or -456,00"
                    />
                </div>
            </div>

            {/* ── Compare button ── */}
            {hasAnyValue && result && (
                <button
                    onClick={() => setSubmitted(true)}
                    className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                    <ArrowRightLeft size={16} />
                    Compare with SmartTax Estimate
                </button>
            )}

            {/* ── Results ── */}
            {submitted && discrepancies.length > 0 && (
                <div className="space-y-4">
                    <div className={`rounded-xl border-2 p-4 flex items-start gap-3 ${hasMajorIssue
                        ? 'border-red-300 bg-red-50'
                        : hasIssues
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-green-300 bg-green-50'
                        }`}>
                        {hasMajorIssue
                            ? <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            : hasIssues
                                ? <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                : <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
                        }
                        <div>
                            <p className={`font-semibold ${hasMajorIssue ? 'text-red-800' : hasIssues ? 'text-amber-800' : 'text-green-800'}`}>
                                {hasMajorIssue
                                    ? '⚠ Significant discrepancies found — consider raising an Einspruch'
                                    : hasIssues
                                        ? 'Minor differences detected — review the details below'
                                        : '✅ Your Bescheid matches our estimate — all looks correct'}
                            </p>
                            <p className={`text-xs mt-1 ${hasMajorIssue ? 'text-red-700' : hasIssues ? 'text-amber-700' : 'text-green-700'}`}>
                                {hasMajorIssue
                                    ? 'Click each row to see what changed and get guidance on how to object.'
                                    : hasIssues
                                        ? 'Small differences may be normal (rounding, timing). Review each item below.'
                                        : 'No action needed — your filing appears to have been processed correctly.'}
                            </p>
                        </div>
                    </div>

                    <h2 className="text-base font-semibold text-gray-800 dark:text-slate-200">Comparison Detail</h2>
                    <div className="space-y-3">
                        {discrepancies.map((d, i) => <DiscrepancyRow key={i} item={d} />)}
                    </div>

                    {/* Einspruch guide */}
                    {hasIssues && (
                        <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                            <button
                                onClick={() => setShowEinspruchGuide((o) => !o)}
                                className="w-full flex items-center justify-between text-left"
                            >
                                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                    <Info size={16} className="text-brand-600" />
                                    How to Raise an Einspruch (Formal Objection)
                                </h2>
                                {showEinspruchGuide ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </button>
                            {showEinspruchGuide && (
                                <div className="mt-4 space-y-4 text-sm text-gray-700">
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                        <strong>Deadline:</strong> You have exactly <strong>30 days</strong> from the date on the Steuerbescheid to raise an Einspruch.
                                        {einspruchDeadline && <span> Your deadline is <strong>{einspruchDeadline}</strong>.</span>}
                                    </div>
                                    <ol className="space-y-3 list-none">
                                        {[
                                            { n: 1, title: 'Write a formal Einspruchsschreiben', body: 'Address it to your Finanzamt (the one that issued the Bescheid). Include: your name, address, tax ID (Steuernummer), the Bescheid date, and the specific objection: "Ich erhebe Einspruch gegen den Steuerbescheid vom [date]."' },
                                            { n: 2, title: 'State what you are objecting to', body: 'Reference the specific Zeile (line number) and explain why you believe the value is incorrect. Attach supporting evidence (receipts, certificates, employer letter).' },
                                            { n: 3, title: 'Request a Aussetzung der Vollziehung (AdV)', body: 'If you owe money, you can request suspension of payment while the objection is being reviewed. This prevents penalties during the process.' },
                                            { n: 4, title: 'Submit by the deadline', body: 'Send by post (Einwurfeinschreiben) to have proof of delivery, or via Mein ELSTER (secure message / Einspruch upload). Keep a copy.' },
                                            { n: 5, title: 'Follow up', body: 'The Finanzamt must respond to your Einspruch with a Einspruchsentscheidung. If they reject it, you can escalate to Klage (tax court) within 1 month.' },
                                        ].map(({ n, title, body }) => (
                                            <li key={n} className="flex gap-3">
                                                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">{n}</span>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{title}</p>
                                                    <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{body}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                    <p className="text-xs text-gray-400 border-t pt-3">
                                        SmartTax Germany provides this guidance for informational purposes. For complex disputes,
                                        consult a Steuerberater (tax advisor) or Lohnsteuerhilfeverein.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI advisor CTA */}
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
                        <Bot size={18} className="text-brand-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-brand-800">Ask the AI Advisor about your discrepancies</p>
                            <p className="text-xs text-brand-700 mt-0.5">
                                The advisor can explain each difference in plain English and help you decide whether to raise an Einspruch.
                            </p>
                            <button
                                onClick={() => navigate('/advisor')}
                                className="mt-2 text-xs font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
                            >
                                Open AI Advisor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {submitted && discrepancies.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                    <p className="font-semibold text-green-800">No figures entered to compare yet</p>
                    <p className="text-xs text-green-700 mt-1">Fill in at least one figure from your Bescheid above and click Compare.</p>
                </div>
            )}

            {/* ── Footer disclaimer ── */}
            <p className="text-xs text-gray-400 text-center pb-4">
                This tool provides guidance only. SmartTax Germany accepts no liability for decisions based on this comparison.
                If significant amounts are at stake, consult a qualified Steuerberater.
            </p>
        </div>
    )
}
