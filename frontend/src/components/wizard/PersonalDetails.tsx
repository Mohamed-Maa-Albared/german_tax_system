import { useForm } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { PersonalData } from '../../types/tax'

interface Props {
    onNext: () => void
}

export default function PersonalDetails({ onNext }: Props) {
    const { personal, updatePersonal } = useTaxStore()
    const { register, handleSubmit } = useForm<PersonalData>({ defaultValues: personal })

    function onSubmit(data: PersonalData) {
        updatePersonal(data)
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Personal Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Year</label>
                    <select
                        {...register('taxYear', { valueAsNumber: true })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        {[2024, 2025, 2026].map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Federal State</label>
                    <select
                        {...register('federalState')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        {[
                            ['BY', 'Bayern'],
                            ['BW', 'Baden-Württemberg'],
                            ['BE', 'Berlin'],
                            ['BB', 'Brandenburg'],
                            ['HB', 'Bremen'],
                            ['HH', 'Hamburg'],
                            ['HE', 'Hessen'],
                            ['MV', 'Mecklenburg-Vorpommern'],
                            ['NI', 'Niedersachsen'],
                            ['NW', 'Nordrhein-Westfalen'],
                            ['RP', 'Rheinland-Pfalz'],
                            ['SL', 'Saarland'],
                            ['SN', 'Sachsen'],
                            ['ST', 'Sachsen-Anhalt'],
                            ['SH', 'Schleswig-Holstein'],
                            ['TH', 'Thüringen'],
                        ].map(([code, name]) => (
                            <option key={code} value={code}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Children</label>
                    <input
                        type="number"
                        min={0}
                        max={20}
                        {...register('numChildren', { valueAsNumber: true })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>

                <div className="flex flex-col gap-2 justify-center pt-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" {...register('isMarried')} className="rounded" />
                        Married / civil partnership (Ehegattensplitting)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" {...register('isChurchMember')} className="rounded" />
                        Church member (Kirchensteuer)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" {...register('isDisabled')} className="rounded" />
                        Disability (Behinderung)
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Disability Grade (Grad der Behinderung)
                    </label>
                    <select
                        {...register('disabilityGrade', { valueAsNumber: true })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        {[0, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((g) => (
                            <option key={g} value={g}>
                                {g === 0 ? 'None' : `GdB ${g}`}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">From your Schwerbehindertenausweis</p>
                </div>
            </div>

            <div className="flex justify-end">
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
