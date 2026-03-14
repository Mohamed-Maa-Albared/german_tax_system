import { Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TaxBreakdownComponent from '../components/TaxBreakdown'
import { downloadElsterXml } from '../lib/elsterXml'
import { useTaxStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'

export default function Results() {
    const navigate = useNavigate()
    const { result, personal, employment, reset, resultsHistory } = useTaxStore()

    if (!result) {
        navigate('/wizard')
        return null
    }

    const isRefund = result.refund_or_payment >= 0

    // Multi-year comparison: show if we have more than one distinct year in history
    const comparisonRows = resultsHistory.length > 1 ? [...resultsHistory].reverse() : []

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    Tax Estimate — {personal.taxYear}
                </h1>
                <div className="text-right">
                    <p className="text-xs text-gray-400">Gross Income</p>
                    <p className="text-lg font-semibold text-gray-700">
                        {formatCurrency(employment.grossSalary)}
                    </p>
                </div>
            </div>

            {/* Refund / payment banner */}
            <div
                className={`rounded-xl p-5 text-center border-2 ${isRefund
                    ? 'bg-green-50 border-green-400 text-green-800'
                    : 'bg-red-50 border-red-400 text-red-800'
                    }`}
            >
                <p className="text-sm font-medium">
                    {isRefund ? '🎉 Expected Refund' : '⚠ Additional Payment Due'}
                </p>
                <p className="text-4xl font-extrabold mt-1">
                    {isRefund ? '+' : '-'}
                    {formatCurrency(Math.abs(result.refund_or_payment))}
                </p>
            </div>

            <TaxBreakdownComponent breakdown={result} />

            {/* Multi-year comparison */}
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

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={() => navigate('/filing')}
                    className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center justify-center gap-2"
                >
                    📄 Get Filing Instructions &amp; Summary
                </button>
                <button
                    onClick={() => downloadElsterXml({ personal, breakdown: result })}
                    className="px-6 py-2.5 border border-brand-300 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50 flex items-center justify-center gap-2"
                >
                    <Download size={15} />
                    Download ELSTER XML
                </button>
                <button
                    onClick={() => navigate('/wizard')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                    Edit Inputs
                </button>
                <button
                    onClick={() => {
                        reset()
                        navigate('/wizard')
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 text-gray-500"
                >
                    Start Over
                </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
                This is an estimate only. Consult a tax advisor (Steuerberater) for official filings.
                The ELSTER XML export is a reference document only — not a certified ERiC submission.
            </p>
        </div>
    )
}
