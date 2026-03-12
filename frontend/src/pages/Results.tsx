import { useNavigate } from 'react-router-dom'
import TaxBreakdownComponent from '../components/TaxBreakdown'
import { useTaxStore } from '../lib/store'
import { formatCurrency } from '../lib/utils'

export default function Results() {
    const navigate = useNavigate()
    const { result, personal, employment, reset } = useTaxStore()

    if (!result) {
        navigate('/wizard')
        return null
    }

    const isRefund = result.refund_or_payment >= 0

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

            <div className="flex gap-3 justify-center">
                <button
                    onClick={() => {
                        reset()
                        navigate('/wizard')
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                    Start Over
                </button>
                <button
                    onClick={() => navigate('/wizard')}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                    Edit Inputs
                </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
                This is an estimate only. Consult a tax advisor (Steuerberater) for official filings.
            </p>
        </div>
    )
}
