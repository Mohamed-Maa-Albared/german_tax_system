import { Calculator, CheckCircle2, Lightbulb } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWizardStore } from '../../../lib/store'
import { calculateTax } from '../../../lib/taxCalculator'
import { formatEuro } from '../../../lib/utils'

interface Props { onCalculate: () => void; onBack: () => void }

export default function Review({ onCalculate, onBack }: Props) {
    const store = useWizardStore()
    const [preview, setPreview] = useState<ReturnType<typeof calculateTax> | null>(null)

    useEffect(() => {
        // Run a quick preview calculation on mount
        const result = calculateTax(
            store.personal, store.employment, store.otherIncome,
            store.deductions, store.specialExpenses, store.taxParams
        )
        setPreview(result)
    }, [])

    function handleCalculate() {
        store.runCalculation()
        onCalculate()
    }

    const totalIncome = (store.employment.grossSalary || 0) +
        (store.otherIncome.selfEmployedRevenue - store.otherIncome.selfEmployedExpenses || 0) +
        (store.otherIncome.rentalIncome - store.otherIncome.rentalExpenses || 0)

    return (
        <div className="wizard-step space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-500 mb-1">Review & Calculate</h2>
                <p className="text-slate-500 text-sm">Check your summary, review smart suggestions, then calculate your tax.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card p-3 text-center">
                    <p className="text-xs text-slate-400 font-medium mb-1">Total income</p>
                    <p className="font-bold text-brand-600 text-lg">{formatEuro(totalIncome)}</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-xs text-slate-400 font-medium mb-1">Est. withheld</p>
                    <p className="font-bold text-slate-700 text-lg">{formatEuro(store.employment.lohnsteuerWithheld + store.employment.soliWithheld + store.employment.kirchensteuerWithheld)}</p>
                </div>
                {preview && (
                    <>
                        <div className="card p-3 text-center">
                            <p className="text-xs text-slate-400 font-medium mb-1">Taxable income (zvE)</p>
                            <p className="font-bold text-slate-700 text-lg">{formatEuro(preview.zve)}</p>
                        </div>
                        <div className={`card p-3 text-center ${preview.refund_or_payment >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <p className="text-xs text-slate-400 font-medium mb-1">
                                {preview.refund_or_payment >= 0 ? '🎉 Est. refund' : '⚠️ Est. due'}
                            </p>
                            <p className={`font-bold text-lg ${preview.refund_or_payment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {preview.refund_or_payment >= 0 ? '+' : ''}{formatEuro(preview.refund_or_payment)}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* What you've entered */}
            <div className="card p-4 text-sm space-y-2">
                <p className="font-semibold text-slate-700 mb-3">What you've entered</p>
                <SummaryRow label="Tax year" value={String(store.personal.taxYear)} />
                <SummaryRow label="Status" value={store.personal.isMarried ? 'Married (joint assessment)' : 'Single'} />
                {store.personal.numChildren > 0 && <SummaryRow label="Children" value={`${store.personal.numChildren} child(ren)`} />}
                {store.employment.hasEmployment && <SummaryRow label="Gross salary" value={formatEuro(store.employment.grossSalary)} />}
                {store.otherIncome.hasSelfEmployed && <SummaryRow label="Self-employed net" value={formatEuro(Math.max(0, store.otherIncome.selfEmployedRevenue - store.otherIncome.selfEmployedExpenses))} />}
                {store.deductions.commuteKm > 0 && <SummaryRow label="Commute" value={`${store.deductions.commuteKm} km × ${store.deductions.commuteDays} days`} />}
                {store.deductions.homeOfficeDays > 0 && <SummaryRow label="Home office days" value={`${store.deductions.homeOfficeDays} days`} />}
            </div>

            {/* AI suggestions */}
            {preview && preview.suggestions.length > 0 && (
                <div className="card p-4 border-4 border-accent-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={18} className="text-accent-500" />
                        <span className="font-semibold text-slate-800">Smart Suggestions</span>
                        <span className="text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full font-medium">
                            {preview.suggestions.length} tips
                        </span>
                    </div>
                    <ul className="space-y-2">
                        {preview.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <CheckCircle2 size={15} className="text-accent-500 mt-0.5 flex-shrink-0" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Calculate button */}
            <button
                type="button"
                onClick={handleCalculate}
                className="btn-accent w-full py-4 text-base font-bold"
            >
                <Calculator size={20} />
                Calculate My Tax Return
            </button>

            <button type="button" onClick={onBack} className="btn-ghost w-full border border-slate-200">← Back</button>
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between border-b border-slate-100 pb-1.5 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-700">{value}</span>
        </div>
    )
}
