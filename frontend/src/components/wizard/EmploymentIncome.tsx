import { useForm } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { formatCurrency } from '../../lib/utils'
import { EmploymentData } from '../../types/tax'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function EmploymentIncome({ onNext, onBack }: Props) {
    const { employment, updateEmployment } = useTaxStore()
    const { register, handleSubmit, watch } = useForm<EmploymentData>({
        defaultValues: employment,
    })

    const gross = watch('grossSalary') || 0

    function onSubmit(data: EmploymentData) {
        updateEmployment(data)
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Employment Income</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gross Salary (€/year)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('grossSalary', { valueAsNumber: true, min: 0, max: 500000 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Income Tax Withheld (€/year)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('taxesWithheld', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Lohnsteuer already paid via payslip</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Annual Bonus (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={100}
                        {...register('bonus', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>

                {gross > 0 && (
                    <div className="flex items-center bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
                        Monthly gross: <span className="font-semibold ml-1">{formatCurrency(gross / 12)}</span>
                    </div>
                )}
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
