import { useForm, useWatch } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { formatCurrency } from '../../lib/utils'
import { EmploymentData } from '../../types/tax'
import AmountToggle, { useAmountMode } from '../AmountToggle'
import FieldHint from '../FieldHint'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function EmploymentIncome({ onNext, onBack }: Props) {
    const { employment, updateEmployment } = useTaxStore()
    const { register, handleSubmit, control, setValue, watch } = useForm<EmploymentData>({
        defaultValues: employment,
    })

    const { mode, setMode, toAnnual, fromAnnual } = useAmountMode()
    const unit = mode === 'monthly' ? '€/month' : '€/year'
    const gross = useWatch({ control, name: 'grossSalary' }) || 0
    const bonusType = useWatch({ control, name: 'bonusType' }) ?? 'fixed'
    const bonusPercent = useWatch({ control, name: 'bonusPercent' }) ?? 0
    const computedBonus = bonusType === 'percent' ? Math.round((gross * bonusPercent) / 100) : (watch('bonus') || 0)
    const annualGross = toAnnual(gross)

    function onSubmit(data: EmploymentData) {
        const resolved: EmploymentData = {
            ...data,
            grossSalary: toAnnual(data.grossSalary),
            taxesWithheld: toAnnual(data.taxesWithheld),
            bonus: data.bonusType === 'percent'
                ? Math.round((toAnnual(data.grossSalary) * (data.bonusPercent ?? 0)) / 100)
                : toAnnual(data.bonus ?? 0),
        }
        updateEmployment(resolved)
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Employment Income</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Find these on your <strong>Lohnsteuerbescheinigung</strong> — the annual tax
                        certificate your employer sends you each February.
                    </p>
                </div>
                <div className="self-start sm:self-center pt-1 sm:pt-0">
                    <AmountToggle mode={mode} onChange={setMode} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gross Salary */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gross Salary ({unit})
                        <FieldHint
                            explanation="Your total annual pay before any tax or social security deductions — the amount in your employment contract multiplied by 12."
                            germanTerm="Bruttoarbeitslohn"
                            whereToFind="Box 3 on your Lohnsteuerbescheinigung (employer's annual tax statement), or add up all your monthly gross payslip amounts."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={2000000}
                        step="any"
                        {...register('grossSalary', { valueAsNumber: true, min: 0, max: 2000000 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder={mode === 'monthly' ? 'e.g. 4583' : 'e.g. 55000'}
                    />
                    {gross > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                            {mode === 'monthly'
                                ? <>Annual total: <span className="font-medium text-gray-600">{formatCurrency(annualGross)}</span></>
                                : <>Monthly: <span className="font-medium text-gray-600">{formatCurrency(gross / 12)}</span></>}
                        </p>
                    )}
                </div>

                {/* Income Tax Withheld */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Income Tax Already Withheld ({unit})
                        <FieldHint
                            explanation="The income tax (Lohnsteuer) your employer deducted from your monthly pay and sent to the tax office. Filing your return shows whether you overpaid (refund) or underpaid (additional payment)."
                            germanTerm="Lohnsteuer einbehalten"
                            whereToFind="Box 4 on your Lohnsteuerbescheinigung. If you have multiple employers, add all Box 4 amounts together."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('taxesWithheld', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        placeholder={mode === 'monthly' ? 'e.g. 1000' : 'e.g. 12000'}
                    />
                </div>

                {/* Bonus section — full width */}
                <div className="sm:col-span-2 space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Annual Bonus (optional)
                        <FieldHint
                            explanation="Any extra pay beyond your regular salary — performance bonus, 13th month pay, holiday pay (Urlaubsgeld), or profit-sharing. It's part of your taxable income and is already included in your Lohnsteuerbescheinigung gross amount. Only add it here if it's NOT already in your gross salary figure above."
                            germanTerm="Bonus / Sonderzahlung"
                            whereToFind="Check your December payslip or employment contract. If your Lohnsteuerbescheinigung includes it in Box 3, do NOT enter it again here."
                        />
                    </label>

                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400 text-xs">Enter as:</span>
                        <button
                            type="button"
                            onClick={() => setValue('bonusType', 'fixed')}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${bonusType === 'fixed' ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Fixed amount (€)
                        </button>
                        <button
                            type="button"
                            onClick={() => setValue('bonusType', 'percent')}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${bonusType === 'percent' ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            % of gross salary
                        </button>
                    </div>

                    <input type="hidden" {...register('bonusType')} />

                    {bonusType === 'fixed' ? (
                        <input
                            type="number"
                            min={0}
                            step="any"
                            {...register('bonus', { valueAsNumber: true, min: 0 })}
                            className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                            placeholder="e.g. 5000"
                        />
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={0}
                                    max={200}
                                    step={0.1}
                                    {...register('bonusPercent', { valueAsNumber: true, min: 0, max: 200 })}
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                                    placeholder="e.g. 15"
                                />
                                <span className="text-gray-500 text-sm font-medium">%</span>
                            </div>
                            {gross > 0 && bonusPercent > 0 && (
                                <span className="text-sm text-brand-600 font-semibold">
                                    = {formatCurrency(computedBonus)}
                                </span>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-gray-400">Leave at 0 if you had no bonus, or if it is already included in your gross salary above.</p>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                    ← Back
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                    Next →
                </button>
            </div>
        </form>
    )
}
