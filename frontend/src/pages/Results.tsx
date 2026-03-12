import { Home, Printer, RotateCcw, Sliders } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import TaxBreakdown from '../components/TaxBreakdown'
import { useWizardStore } from '../lib/store'
import { calculateTax } from '../lib/taxCalculator'
import { formatEuro } from '../lib/utils'
import { TaxCalculationResult } from '../types/tax'

export default function Results() {
    const navigate = useNavigate()
    const { results, personal, employment, otherIncome, deductions, specialExpenses, taxParams, reset } = useWizardStore()
    const [showSimulator, setShowSimulator] = useState(false)
    const [simResult, setSimResult] = useState<TaxCalculationResult | null>(null)
    const [simOfficeDays, setSimOfficeDays] = useState(0)
    const [simCommuteKm, setSimCommuteKm] = useState(0)

    useEffect(() => {
        if (!results) {
            navigate('/wizard')
        }
    }, [results, navigate])

    // Update simulator when sliders change
    useEffect(() => {
        if (!results || !taxParams) return
        const simDeductions = {
            ...deductions,
            homeOfficeDays: simOfficeDays,
            commuteKm: simCommuteKm,
        }
        const r = calculateTax(personal, employment, otherIncome, simDeductions, specialExpenses, taxParams)
        setSimResult(r)
    }, [simOfficeDays, simCommuteKm, results, taxParams, personal, employment, otherIncome, deductions, specialExpenses])

    // Init simulator from current values
    useEffect(() => {
        if (results) {
            setSimOfficeDays(deductions.homeOfficeDays)
            setSimCommuteKm(deductions.commuteKm)
        }
    }, [results, deductions])

    if (!results) return null

    const handlePrint = () => window.print()

    const handleReset = () => {
        reset()
        navigate('/')
    }

    const displayResult = showSimulator && simResult ? simResult : results
    const simDiff = simResult
        ? simResult.refund_or_payment - results.refund_or_payment
        : 0

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    {/* Action bar — hidden on print */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
                        <h1 className="text-2xl font-bold text-brand-500">Your Tax Summary</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSimulator(!showSimulator)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showSimulator
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <Sliders size={15} />
                                What-if Simulator
                            </button>
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <Printer size={15} />
                                Print
                            </button>
                            <button
                                onClick={() => navigate('/wizard')}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <RotateCcw size={15} />
                                Edit
                            </button>
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <Home size={15} />
                                Home
                            </button>
                        </div>
                    </div>

                    {/* What-if Simulator panel */}
                    {showSimulator && (
                        <div className="card p-6 mb-6 border-l-4 border-l-brand-400 print:hidden">
                            <h2 className="text-base font-semibold text-slate-800 mb-1">What-if Simulator</h2>
                            <p className="text-sm text-slate-500 mb-5">
                                Adjust values below to see how changes affect your refund in real time. This does not modify your saved return.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Home office days slider */}
                                <div>
                                    <label className="label mb-1">
                                        Home Office Days: <span className="font-semibold text-brand-500">{simOfficeDays}</span>
                                        <span className="text-slate-400 font-normal ml-1">(max 210)</span>
                                    </label>
                                    <input
                                        type="range" min={0} max={210} step={5}
                                        value={simOfficeDays}
                                        onChange={(e) => setSimOfficeDays(Number(e.target.value))}
                                        className="w-full accent-brand-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                                        <span>0</span><span>105</span><span>210</span>
                                    </div>
                                </div>

                                {/* Commute km slider */}
                                <div>
                                    <label className="label mb-1">
                                        Commute Distance: <span className="font-semibold text-brand-500">{simCommuteKm} km</span>
                                    </label>
                                    <input
                                        type="range" min={0} max={100} step={1}
                                        value={simCommuteKm}
                                        onChange={(e) => setSimCommuteKm(Number(e.target.value))}
                                        className="w-full accent-brand-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                                        <span>0 km</span><span>50 km</span><span>100 km</span>
                                    </div>
                                </div>
                            </div>

                            {simResult && (
                                <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${simDiff >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {simDiff >= 0 ? '+' : ''}{formatEuro(simDiff)} compared to your current figures
                                    {simResult.refundOrPayment >= 0
                                        ? ` — simulated refund: ${formatEuro(simResult.refundOrPayment)}`
                                        : ` — simulated payment: ${formatEuro(Math.abs(simResult.refundOrPayment))}`}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tax breakdown */}
                    <TaxBreakdown result={displayResult} />

                    {/* Disclaimer */}
                    <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 print:mt-4">
                        <strong>Disclaimer:</strong> These calculations are based on §32a EStG as of 2026 and are for informational purposes only.
                        They do not constitute professional tax advice. Always verify with the official ELSTER portal or a
                        certified tax advisor (Steuerberater) before filing.
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-8 text-center print:hidden">
                        <p className="text-slate-500 text-sm mb-3">Ready to proceed with your official filing?</p>
                        <a
                            href="https://www.elster.de"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            File via ELSTER (official German tax portal)
                        </a>
                    </div>
                </div>
            </div>
        </Layout>
    )
}
