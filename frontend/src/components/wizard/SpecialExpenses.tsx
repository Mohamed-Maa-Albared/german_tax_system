import { useForm } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { SpecialExpensesData } from '../../types/tax'
import AIHint from '../AIHint'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function SpecialExpenses({ onNext, onBack }: Props) {
    const { specialExpenses, updateSpecialExpenses } = useTaxStore()
    const { register, handleSubmit } = useForm<SpecialExpensesData>({
        defaultValues: specialExpenses,
    })

    function onSubmit(data: SpecialExpensesData) {
        updateSpecialExpenses(data)
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
                Special Expenses <span className="text-sm font-normal text-gray-500">(Sonderausgaben)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pension Contributions (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('pensionContributions', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <AIHint term="Rentenversicherung" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Health Insurance (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('healthInsuranceContributions', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">GKV/PKV premiums — 100% deductible (§10 EStG)</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Long-term Care Insurance (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('longTermCareInsurance', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Pflegeversicherungsbeiträge — fully deductible</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Riester Contributions (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('riesterContributions', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Donations (€)</label>
                    <input
                        type="number"
                        min={0}
                        step={10}
                        {...register('donations', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Capped at 20% of total income</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alimony Paid (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('alimonyPaid', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Childcare Costs (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('childcareCosts', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">80% deductible, max €4,800/child</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medical &amp; Healthcare Costs (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={50}
                        {...register('medicalCosts', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Außergewöhnliche Belastungen (§33 EStG) — amount above your personal threshold is deductible
                    </p>
                    <AIHint term="Außergewöhnliche Belastungen" />
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                    ← Back
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
                >
                    Next →
                </button>
            </div>
        </form>
    )
}
