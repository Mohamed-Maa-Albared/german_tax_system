import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { formatCurrency } from '../../lib/utils'
import { EmploymentData } from '../../types/tax'
import AmountToggle, { useAmountMode } from '../AmountToggle'
import FieldHint from '../FieldHint'
import LStBImport, { LStBFields } from '../LStBImport'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function EmploymentIncome({ onNext, onBack }: Props) {
    const { employment, updateEmployment } = useTaxStore()
    const { register, handleSubmit, control, setValue, watch } = useForm<EmploymentData>({
        defaultValues: {
            ...employment,
            salaryPeriods: employment.salaryPeriods?.length
                ? employment.salaryPeriods
                : [{ months: 12, monthlyGross: 0 }],
        },
    })

    const { fields, append, remove } = useFieldArray({ control, name: 'salaryPeriods' })

    const { mode, setMode, toAnnual, fromAnnual } = useAmountMode()
    const unit = mode === 'monthly' ? '€/month' : '€/year'
    const gross = useWatch({ control, name: 'grossSalary' }) || 0
    const bonusType = useWatch({ control, name: 'bonusType' }) ?? 'fixed'
    const bonusPercent = useWatch({ control, name: 'bonusPercent' }) ?? 0
    const hasSalaryChange = useWatch({ control, name: 'hasSalaryChange' }) ?? false
    const salaryPeriods = useWatch({ control, name: 'salaryPeriods' }) ?? []
    const computedBonus = bonusType === 'percent' ? Math.round((gross * bonusPercent) / 100) : (watch('bonus') || 0)
    const annualGross = toAnnual(gross)

    // Compute annual gross from periods (sum of months × monthlyGross)
    const periodsAnnualGross = salaryPeriods.reduce(
        (sum, p) => sum + (Number(p?.months) || 0) * (Number(p?.monthlyGross) || 0),
        0,
    )
    const totalPeriodMonths = salaryPeriods.reduce((sum, p) => sum + (Number(p?.months) || 0), 0)

    // Ensure at least one period row exists when toggle is turned on
    useEffect(() => {
        if (hasSalaryChange && fields.length === 0) {
            append({ months: 6, monthlyGross: 0 })
        }
    }, [hasSalaryChange, fields.length, append])

    function onSubmit(data: EmploymentData) {
        let resolvedGross: number
        if (data.hasSalaryChange && (data.salaryPeriods?.length ?? 0) > 0) {
            resolvedGross = (data.salaryPeriods ?? []).reduce(
                (sum, p) => sum + (Number(p.months) || 0) * (Number(p.monthlyGross) || 0),
                0,
            )
        } else {
            resolvedGross = toAnnual(data.grossSalary)
        }

        const resolved: EmploymentData = {
            ...data,
            grossSalary: resolvedGross,
            taxesWithheld: toAnnual(data.taxesWithheld || 0),
            soliWithheld: toAnnual(data.soliWithheld || 0),
            kirchensteuerWithheld: toAnnual(data.kirchensteuerWithheld || 0),
            bonus: data.bonusType === 'percent'
                ? Math.round((resolvedGross * (data.bonusPercent ?? 0)) / 100)
                : toAnnual(data.bonus ?? 0),
        }
        updateEmployment(resolved)
        onNext()
    }

    function handleLStBImport(fields: LStBFields) {
        setValue('grossSalary', fields.grossSalary)
        setValue('taxesWithheld', fields.taxesWithheld)
        setValue('soliWithheld', fields.soliWithheld)
        setValue('kirchensteuerWithheld', fields.kirchensteuerWithheld)
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="font-heading font-semibold text-xl text-gray-800 dark:text-slate-200">Employment Income</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Find these on your <strong>Lohnsteuerbescheinigung</strong> — the annual tax
                        certificate your employer sends you each February.
                    </p>
                </div>
                <div className="self-start sm:self-center pt-1 sm:pt-0">
                    <AmountToggle mode={mode} onChange={setMode} />
                </div>
            </div>

            {/* LStB XML import */}
            <LStBImport onImport={handleLStBImport} />

            {/* Salary changed during the year toggle */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        {...register('hasSalaryChange')}
                        className="w-4 h-4 accent-brand-600 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        My salary changed during the year
                        <FieldHint
                            explanation="Got a raise, changed jobs, started or ended part-time? Enter each salary period separately and we'll compute the correct annual gross. The tax return uses your total annual earnings regardless of when changes happened."
                            germanTerm="Einkommensänderung im Laufe des Jahres"
                            whereToFind="Your payslips or HR system. Each period is months × monthly gross salary."
                        />
                    </span>
                </label>

                {hasSalaryChange && (
                    <div className="mt-4 space-y-3">
                        <p className="text-xs text-gray-500">
                            Enter each salary period below. Months must add up to 12 for a full tax year.
                        </p>

                        {fields.map((field, idx) => (
                            <div key={field.id} className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-gray-500 w-16 shrink-0">Period {idx + 1}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        max={12}
                                        step={1}
                                        {...register(`salaryPeriods.${idx}.months`, { valueAsNumber: true, min: 1, max: 12 })}
                                        className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                        placeholder="6"
                                    />
                                    <span className="text-xs text-gray-500">months at</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        {...register(`salaryPeriods.${idx}.monthlyGross`, { valueAsNumber: true, min: 0 })}
                                        className="w-32 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                        placeholder="e.g. 4500"
                                    />
                                    <span className="text-xs text-gray-500">€/month gross</span>
                                </div>
                                {fields.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => remove(idx)}
                                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}

                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            {fields.length < 6 && (
                                <button
                                    type="button"
                                    onClick={() => append({ months: 1, monthlyGross: 0 })}
                                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                                >
                                    + Add period
                                </button>
                            )}
                            <div className="text-xs text-gray-500 ml-auto">
                                {totalPeriodMonths !== 12 && (
                                    <span className="text-amber-600 font-medium">
                                        {totalPeriodMonths} months entered (expected 12)
                                    </span>
                                )}
                                {totalPeriodMonths === 12 && periodsAnnualGross > 0 && (
                                    <span className="text-green-700 font-medium">
                                        Annual gross: {formatCurrency(periodsAnnualGross)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gross Salary — hidden when salary change mode is active */}
                {!hasSalaryChange && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                )}

                {/* Income Tax Withheld */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder={mode === 'monthly' ? 'e.g. 1000' : 'e.g. 12000'}
                    />
                </div>

                {/* Soli Withheld */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Solidarity Surcharge Withheld ({unit})
                        <FieldHint
                            explanation="The Solidaritätszuschlag (Soli) deducted by your employer. Most employees pay no Soli in 2026 due to the higher Freigrenze. If withheld, enter the amount here so your total withheld is accurate."
                            germanTerm="Einbehaltener Solidaritätszuschlag"
                            whereToFind="Box 5 on your Lohnsteuerbescheinigung. Often zero."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('soliWithheld', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 0"
                    />
                </div>

                {/* Church Tax Withheld */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Church Tax Withheld ({unit})
                        <FieldHint
                            explanation="Kirchensteuer deducted by your employer if you are registered as a church member. Enter the total across all employers if you had multiple."
                            germanTerm="Einbehaltene Kirchensteuer"
                            whereToFind="Box 6 + Box 7 on your Lohnsteuerbescheinigung (different denominations). Add together if both are non-zero."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('kirchensteuerWithheld', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 0"
                    />
                </div>

                {/* Bonus section — full width */}
                <div className="sm:col-span-2 space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                            className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                    <p className="text-xs text-gray-400 dark:text-slate-500">Leave at 0 if you had no bonus, or if it is already included in your gross salary above.</p>
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
