import { Bot, Download, Edit3, FileCode2, RefreshCw, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaxBreakdownComponent from '../components/TaxBreakdown'
import { downloadElsterXml } from '../lib/elsterXml'
import { useTaxStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'

// ─── ELSTER XML Guide Modal ────────────────────────────────────────────────────
function ElsterGuideModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FileCode2 size={20} className="text-brand-600" />
                        <h2 className="font-bold text-gray-900 text-base">About the ELSTER XML Export</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5 space-y-4 text-sm text-gray-700">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
                        <strong>Reference document only</strong> — this file cannot be uploaded directly to ELSTER.
                        It is a structured guide to help you fill in the official forms accurately.
                    </div>

                    <section>
                        <h3 className="font-semibold text-gray-800 mb-1">What is it?</h3>
                        <p className="leading-relaxed">
                            The XML file contains your complete tax data organised by ELSTER <em>Anlage</em> (section).
                            Each value is annotated with the corresponding ELSTER form field number, where to find
                            the source document, and what the figure means.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-800 mb-2">How to use it — step by step</h3>
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
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">{n}</span>
                                    <span className="leading-relaxed">{text}</span>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-800 mb-1">Which ELSTER forms do I need?</h3>
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
                                <li key={form} className="flex gap-2 py-1 border-b border-gray-50 last:border-0">
                                    <span className="font-medium text-gray-800 w-52 flex-shrink-0">{form}</span>
                                    <span className="text-gray-500">{desc}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <p className="text-xs text-gray-400 leading-relaxed">
                        Always verify all figures with your original source documents (Lohnsteuerbescheinigung,
                        Jahressteuerbescheide, insurance statements). For complex situations (self-employment,
                        rentals, foreign income), consult a Steuerberater or Lohnsteuerhilfeverein.
                    </p>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                    >
                        Got it
                    </button>
                </div>
            </div>
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
                    <h1 className="text-2xl font-bold text-gray-900">
                        Tax Estimate — {personal.taxYear}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {personal.isMarried ? 'Joint filing' : 'Single'} · {formatCurrency(employment.grossSalary)} gross income
                    </p>
                </div>
                <button
                    onClick={() => navigate('/wizard')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors border border-gray-200 hover:border-brand-300 px-3 py-1.5 rounded-lg"
                >
                    <Edit3 size={14} />
                    Edit inputs
                </button>
            </div>

            {/* ── Refund / payment hero ── */}
            <div
                className={`rounded-2xl p-6 text-center border-2 ${isRefund
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                    : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300'
                    }`}
            >
                <p className={`text-sm font-semibold tracking-wide uppercase ${isRefund ? 'text-green-700' : 'text-red-700'}`}>
                    {isRefund ? '🎉 Estimated Tax Refund' : '⚠ Additional Tax Due'}
                </p>
                <p className={`text-5xl font-extrabold mt-2 ${isRefund ? 'text-green-700' : 'text-red-700'}`}>
                    {isRefund ? '+' : '−'}{formatCurrency(Math.abs(result.refund_or_payment))}
                </p>
                <p className={`text-sm mt-2 ${isRefund ? 'text-green-600' : 'text-red-600'}`}>
                    {isRefund
                        ? 'Overpaid via payroll withholding — claim it back by filing your Steuererklärung'
                        : 'You owe this after payroll deductions — file by the mandatory deadline to avoid penalties'
                    }
                </p>
            </div>

            {/* ── Tax breakdown (chart + details) ── */}
            <TaxBreakdownComponent breakdown={result} />

            {/* ── Multi-year comparison ── */}
            {comparisonRows.length > 1 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">Multi-Year Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-400 text-xs">
                                    <th className="pb-2 pr-4 font-medium">Year</th>
                                    <th className="pb-2 pr-4 font-medium text-right">Gross Income</th>
                                    <th className="pb-2 pr-4 font-medium text-right">ZVE</th>
                                    <th className="pb-2 pr-4 font-medium text-right">Income Tax</th>
                                    <th className="pb-2 pr-4 font-medium text-right">Total Tax</th>
                                    <th className="pb-2 font-medium text-right">Refund / Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {comparisonRows.map((r) => {
                                    const rop = r.refund_or_payment
                                    return (
                                        <tr key={r.tax_year} className={r.tax_year === result.tax_year ? 'bg-brand-50' : 'hover:bg-gray-50'}>
                                            <td className="py-2 pr-4 font-semibold text-gray-800">{r.tax_year}</td>
                                            <td className="py-2 pr-4 text-right text-gray-600">{formatCurrency(r.gross_income)}</td>
                                            <td className="py-2 pr-4 text-right text-gray-600">{formatCurrency(r.zve)}</td>
                                            <td className="py-2 pr-4 text-right text-gray-600">{formatCurrency(r.tarifliche_est)}</td>
                                            <td className="py-2 pr-4 text-right text-gray-700 font-medium">{formatCurrency(r.total_tax)}</td>
                                            <td className={`py-2 text-right font-semibold ${rop >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">What do you want to do next?</h2>

                {/* Primary actions */}
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={() => navigate('/filing')}
                        className="flex items-start gap-3 p-4 rounded-xl border-2 border-brand-200 bg-brand-50 hover:bg-brand-100 hover:border-brand-400 transition-colors text-left group"
                    >
                        <span className="text-2xl mt-0.5">📄</span>
                        <div>
                            <p className="font-semibold text-brand-800 group-hover:text-brand-900 text-sm">Get Filing Package</p>
                            <p className="text-xs text-brand-600 mt-0.5 leading-relaxed">
                                ELSTER step-by-step guide + PDF export + filing timeline
                            </p>
                        </div>
                    </button>
                    <button
                        onClick={() => navigate('/advisor')}
                        className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left group"
                    >
                        <Bot size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-gray-800 group-hover:text-emerald-800 text-sm">Maximize My Refund</p>
                            <p className="text-xs text-gray-500 group-hover:text-emerald-600 mt-0.5 leading-relaxed">
                                AI advisor spots missed deductions and updates your calculation
                            </p>
                        </div>
                    </button>
                </div>

                {/* Secondary actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                    <button
                        onClick={() => downloadElsterXml({ personal, breakdown: result })}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                        <Download size={12} />
                        Download ELSTER XML
                    </button>
                    <button
                        onClick={() => setShowElsterGuide(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                        title="What is the ELSTER XML and how do I use it?"
                    >
                        <FileCode2 size={12} />
                        What is the XML?
                    </button>
                    {comparisonRows.length > 0 && (
                        <button
                            onClick={() => navigate('/wizard')}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                        >
                            <TrendingUp size={12} />
                            Add another year
                        </button>
                    )}
                    <button
                        onClick={() => { reset(); navigate('/wizard') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-400 rounded-lg text-xs hover:bg-gray-50 transition-colors ml-auto"
                    >
                        <RefreshCw size={12} />
                        Start over
                    </button>
                </div>
            </div>

            <p className="text-xs text-gray-400 text-center pb-2">
                This is an estimate only. Consult a Steuerberater (tax advisor) for your official filing.
                The ELSTER XML is a reference document — click "What is the XML?" to learn more.
            </p>
        </div>
    )
}
