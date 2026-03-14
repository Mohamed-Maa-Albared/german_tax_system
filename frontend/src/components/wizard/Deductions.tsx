import { useForm } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { DeductionsData } from '../../types/tax'
import AIHint from '../AIHint'
import AmountToggle, { useAmountMode } from '../AmountToggle'
import FieldHint from '../FieldHint'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function Deductions({ onNext, onBack }: Props) {
    const { deductions, updateDeductions } = useTaxStore()
    const { register, handleSubmit } = useForm<DeductionsData>({ defaultValues: deductions })
    const { mode, setMode, toAnnual } = useAmountMode()
    const unit = mode === 'monthly' ? '€/month' : '€/year'

    function onSubmit(data: DeductionsData) {
        updateDeductions({
            ...data,
            workEquipment: toAnnual(data.workEquipment ?? 0),
            workTraining: toAnnual(data.workTraining ?? 0),
            unionFees: toAnnual(data.unionFees ?? 0),
            otherWorkExpenses: toAnnual(data.otherWorkExpenses),
        })
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                        Work Deductions{' '}
                        <span className="text-sm font-normal text-gray-500">(Werbungskosten)</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        The costs of earning your income. A minimum flat-rate of €1,230 per year is
                        applied automatically — you only benefit from entering these if your actual costs
                        are higher.
                    </p>
                </div>
                <div className="self-start sm:self-center pt-1 sm:pt-0 shrink-0">
                    <AmountToggle mode={mode} onChange={setMode} />
                    <p className="text-xs text-gray-400 mt-1 text-right">Only applies to € fields, not km/days</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Commute distance */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commute Distance (km, one-way)
                        <FieldHint
                            explanation="The one-way distance from your home to your usual workplace in kilometres. You can deduct €0.38 per kilometre for each day you commuted in 2026 (up from €0.30 for the first 20 km in previous years)."
                            germanTerm="Entfernungspauschale / Pendlerpauschale"
                            whereToFind="Measure using Google Maps or a route planner (only the direct route, not your actual route). Use the door-to-door distance."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={500}
                        step="any"
                        {...register('commuteKm', { valueAsNumber: true, min: 0, max: 500 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="e.g. 20"
                    />
                    <p className="text-xs text-gray-400 mt-1">€0.38/km × commute days (2026 unified rate from km 1)</p>
                </div>

                {/* Commute days */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commute Days per Year
                        <FieldHint
                            explanation="The number of days you actually travelled to your workplace. Count only days you physically went in — not holidays, sick days, or home-office days. A typical 5-day week with 30 days holiday equals about 220 days."
                            germanTerm="Arbeitstage im Büro"
                            whereToFind="Your calendar or work system. Subtract sick days, public holidays, annual leave, and home-office days from total working days (~220)."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={230}
                        step={1}
                        {...register('commuteDays', { valueAsNumber: true, min: 0, max: 230 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="e.g. 180"
                    />
                </div>

                {/* Home office */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Home Office Days per Year
                        <FieldHint
                            explanation="Days you worked entirely from home. You can claim €6 per day (maximum 210 days = €1,260/year). You cannot claim the commute deduction and home-office deduction for the same day."
                            germanTerm="Homeoffice-Pauschale"
                            whereToFind="Your own records — calendar, HR system, or timesheet. From 2026 stricter proof is required if audited, so keep a log."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={210}
                        step={1}
                        {...register('homeOfficeDays', { valueAsNumber: true, min: 0, max: 210 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="e.g. 80"
                    />
                    <p className="text-xs text-gray-400 mt-1">€6/day, maximum 210 days (€1,260/year)</p>
                    <AIHint term="Homeoffice-Pauschale" />
                </div>

                {/* Work equipment */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Equipment ({unit})
                        <FieldHint
                            explanation="Items you bought specifically for work — desk, office chair, second monitor, headset, keyboard. Items costing up to €952 (net) can be deducted in full in the year of purchase (GWG). More expensive items must be depreciated over several years."
                            germanTerm="Arbeitsmittel / GWG (Geringwertige Wirtschaftsgüter)"
                            whereToFind="Your receipts and purchase invoices. Keep all receipts for work-related purchases — you need them if audited."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('workEquipment', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Desk, laptop, monitor, headset (items ≤ €952 deducted in full)</p>
                </div>

                {/* Work training */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Training &amp; Education ({unit})
                        <FieldHint
                            explanation="Costs of furthering your professional skills — online courses, professional books and journals, conference fees, language courses relevant to your job. This applies to continuing education (Fortbildung), not your first university degree."
                            germanTerm="Fortbildungskosten / Weiterbildung"
                            whereToFind="Receipts for course fees, book purchases, and professional memberships. Keep all invoices."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('workTraining', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Courses, professional books, seminars — must be work-related</p>
                </div>

                {/* Union fees */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Union Fees ({unit})
                        <FieldHint
                            explanation="membership fees paid to a trade union (e.g. IG Metall, ver.di, GEW). These are fully deductible as work expenses with no cap."
                            germanTerm="Gewerkschaftsbeiträge"
                            whereToFind="Your annual membership statement from your union, or check your bank statements for the regular membership payments."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('unionFees', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Gewerkschaftsbeiträge — 100% deductible, no cap</p>
                </div>

                {/* Other work expenses */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Work Expenses ({unit})
                        <FieldHint
                            explanation="Any other costs directly caused by your job that aren't covered above — work clothing (e.g. uniforms, safety gear), application costs, professional insurance, double-housekeeping costs if you had to move for work."
                            germanTerm="sonstige Werbungskosten"
                            whereToFind="Your receipts. Each item must have a clear professional purpose — mix of personal/professional use must be estimated and only the work-related share claimed."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('otherWorkExpenses', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Work clothing, application costs, professional insurances, etc.</p>
                </div>
            </div>

            <div className="flex justify-between">
                <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    ← Back
                </button>
                <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700">
                    Next →
                </button>
            </div>
        </form>
    )
}
