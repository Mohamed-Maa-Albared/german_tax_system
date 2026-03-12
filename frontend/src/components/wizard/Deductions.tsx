import { useForm } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { DeductionsData } from '../../types/tax'
import AIHint from '../AIHint'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function Deductions({ onNext, onBack }: Props) {
    const { deductions, updateDeductions } = useTaxStore()
    const { register, handleSubmit } = useForm<DeductionsData>({ defaultValues: deductions })

    function onSubmit(data: DeductionsData) {
        updateDeductions(data)
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
                Work Deductions{' '}
                <span className="text-sm font-normal text-gray-500">(Werbungskosten)</span>
            </h2>
            <p className="text-sm text-gray-500">
                Minimum Werbungskosten-Pauschale of €1,230 is applied automatically.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commute Distance (km, one-way)
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={500}
                        step={1}
                        {...register('commuteKm', { valueAsNumber: true, min: 0, max: 500 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">€0.38/km × days</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commute Days/Year</label>
                    <input
                        type="number"
                        min={0}
                        max={230}
                        step={1}
                        {...register('commuteDays', { valueAsNumber: true, min: 0, max: 230 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Home Office Days/Year
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={210}
                        step={1}
                        {...register('homeOfficeDays', { valueAsNumber: true, min: 0, max: 210 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">€6/day, max 210 days</p>
                    <AIHint term="Homeoffice-Pauschale" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Work Expenses (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={10}
                        {...register('otherWorkExpenses', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Tools, work clothing, etc.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Equipment (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={10}
                        {...register('workEquipment', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Desk, laptop, chair, headset (GWG ≤ €952 fully deductible)</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Training &amp; Education (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={10}
                        {...register('workTraining', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Courses, professional books, seminars</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Union Fees (€)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={10}
                        {...register('unionFees', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Gewerkschaftsbeiträge — fully deductible</p>
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
