import { useForm } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { OtherIncomeData } from '../../types/tax'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function OtherIncome({ onNext, onBack }: Props) {
    const { otherIncome, updateOtherIncome } = useTaxStore()
    const { register, handleSubmit } = useForm<OtherIncomeData>({ defaultValues: otherIncome })

    function onSubmit(data: OtherIncomeData) {
        updateOtherIncome(data)
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Other Income</h2>

            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Self-Employment (Freelance)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Revenue (€)" name="selfEmployedRevenue" register={register} />
                    <Field label="Business Expenses (€)" name="selfEmployedExpenses" register={register} />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Capital Income (Kapitalerträge)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Dividends (€)" name="dividends" register={register} />
                    <Field label="Capital Gains (€)" name="capitalGains" register={register} />
                    <Field
                        label="Capital Taxes Already Withheld (€)"
                        name="capitalTaxesWithheld"
                        register={register}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    €1,000 Sparer-Pauschbetrag is applied automatically.
                </p>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Rental Income (Vermietung)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Rental Income (€)" name="rentalIncome" register={register} />
                    <Field label="Rental Expenses (€)" name="rentalExpenses" register={register} />
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

function Field({
    label,
    name,
    register,
}: {
    label: string
    name: keyof OtherIncomeData
    register: ReturnType<typeof useForm<OtherIncomeData>>['register']
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type="number"
                min={0}
                step={100}
                {...register(name, { valueAsNumber: true, min: 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
        </div>
    )
}
