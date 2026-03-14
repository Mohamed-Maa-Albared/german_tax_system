import { useForm, useWatch } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { PersonalData } from '../../types/tax'
import FieldHint from '../FieldHint'

interface Props {
    onNext: () => void
}

const YEAR_DEADLINES: Record<number, { deadline: string; urgent: boolean }> = {
    2022: { deadline: '31 Dec 2026', urgent: true },
    2023: { deadline: '31 Dec 2027', urgent: false },
    2024: { deadline: '31 Dec 2028', urgent: false },
    2025: { deadline: '31 Jul 2026 (mandatory) / 31 Dec 2029 (voluntary)', urgent: false },
    2026: { deadline: '31 Jul 2027 (mandatory) / 31 Dec 2030 (voluntary)', urgent: false },
}

export default function PersonalDetails({ onNext }: Props) {
    const { personal, updatePersonal } = useTaxStore()
    const { register, handleSubmit, control } = useForm<PersonalData>({ defaultValues: personal })

    const isDisabled = useWatch({ control, name: 'isDisabled' })
    const isChurchMember = useWatch({ control, name: 'isChurchMember' })
    const taxYear = useWatch({ control, name: 'taxYear' }) ?? 2026

    function onSubmit(data: PersonalData) {
        updatePersonal(data)
        onNext()
    }

    const yearInfo = YEAR_DEADLINES[taxYear]

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-800">Personal Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Tell us about yourself so we can apply the right tax rules.
                </p>
            </div>

            {/* Multi-year banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                <p className="font-semibold mb-1">📅 You can file for multiple years</p>
                <p className="text-amber-800 text-xs leading-relaxed">
                    German law allows you to voluntarily file your tax return up to 4 years back.
                    Run this calculator once per year. Each year's rules may differ slightly —
                    our calculator uses 2026 parameters as the closest available estimate for all years.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tax year */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Year
                        <FieldHint
                            explanation="The year your income was earned. You file your return in the following year (e.g. file your 2025 return in 2026). You can file up to 4 years back voluntarily."
                            germanTerm="Veranlagungsjahr"
                            whereToFind="Your Lohnsteuerbescheinigung states the year it covers at the top of the document."
                        />
                    </label>
                    <select
                        {...register('taxYear', { valueAsNumber: true })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    >
                        {[2022, 2023, 2024, 2025, 2026].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    {yearInfo && (
                        <p className={`text-xs mt-1 ${yearInfo.urgent ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            {yearInfo.urgent ? '⚠ Filing deadline: ' : 'Voluntary deadline: '}
                            {yearInfo.deadline}
                        </p>
                    )}
                </div>

                {/* Federal state */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Federal State (Bundesland)
                        <FieldHint
                            explanation="The German state where you live. This affects church tax rates (8% in Bavaria & Baden-Württemberg, 9% elsewhere)."
                            germanTerm="Bundesland / Wohnsitzfinanzamt"
                            whereToFind="Your registration certificate (Meldebescheinigung) or the address on your payslip."
                        />
                    </label>
                    <select
                        {...register('federalState')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    >
                        {[
                            ['BY', 'Bayern (Bavaria)'],
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
                            <option key={code} value={code}>{name}</option>
                        ))}
                    </select>
                </div>

                {/* Children */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Children
                        <FieldHint
                            explanation="Children under 18, or up to 25 if in education or vocational training. Each child entitles you to either the child allowance (Kinderfreibetrag) or monthly child benefit (Kindergeld €259/month) — the tax office automatically applies whichever is more beneficial."
                            germanTerm="Kinder / Kinderfreibetrag"
                            whereToFind="Your Lohnsteuerbescheinigung or the ELStAM data your employer has on file. The tax office tracks this automatically once registered."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={20}
                        step={1}
                        {...register('numChildren', { valueAsNumber: true })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-3 justify-center pt-2">
                    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" {...register('isMarried')} className="rounded mt-0.5" />
                        <span>
                            Married / civil partnership
                            <FieldHint
                                explanation="Married couples and registered civil partners (Eingetragene Lebenspartnerschaft) can file jointly. This applies the 'Splitting' method which halves your combined income before calculating tax — a big saving when partners earn different amounts."
                                germanTerm="Zusammenveranlagung / Ehegattensplitting"
                                whereToFind="Your tax class (Steuerklasse) on your payslip — Class III/V or IV/IV indicates married. You can also check your ELStAM registration."
                            />
                        </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" {...register('isChurchMember')} className="rounded mt-0.5" />
                        <span>
                            Church member
                            <FieldHint
                                explanation="Members of officially recognised churches (Catholic, Lutheran/Protestant, etc.) pay an additional church tax on top of their income tax — 8% in Bavaria & Baden-Württemberg, 9% in all other states. You can leave the church (Kirchenaustritt) to stop paying."
                                germanTerm="Kirchensteuer / Kirchenmitglied"
                                whereToFind="Box 24 of your Lohnsteuerbescheinigung shows the church tax withheld. If it shows any amount, you are a church member in the tax records."
                            />
                        </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" {...register('isDisabled')} className="rounded mt-0.5" />
                        <span>
                            Recognised disability (GdB ≥ 25)
                            <FieldHint
                                explanation="If you have an officially recognised disability (Schwerbehinderung) with a grade of 25 or higher, you are entitled to a flat tax allowance (Behinderten-Pauschbetrag) that reduces your taxable income — from €384 at GdB 25 up to €7,400 at GdB 100."
                                germanTerm="Behinderung / Grad der Behinderung (GdB)"
                                whereToFind="Your disability certificate (Schwerbehindertenausweis) states your GdB. If you don't have a certificate yet, apply via your local Versorgungsamt."
                            />
                        </span>
                    </label>
                </div>

                {/* Church tax rate — only show when church member */}
                {isChurchMember && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Church Tax Rate
                            <FieldHint
                                explanation="Bavaria and Baden-Württemberg charge 8% church tax on your income tax. All other German states charge 9%."
                                germanTerm="Kirchensteuersatz"
                                whereToFind="Automatically determined by your federal state. Bavaria (BY) and Baden-Württemberg (BW) = 8%. All others = 9%."
                            />
                        </label>
                        <select
                            {...register('churchTaxRateType')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        >
                            <option value="high">9% — all states except Bavaria & BW</option>
                            <option value="low">8% — Bavaria (BY) or Baden-Württemberg (BW)</option>
                        </select>
                    </div>
                )}

                {/* Disability grade — only show when disabled */}
                {isDisabled && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Disability Grade (Grad der Behinderung)
                            <FieldHint
                                explanation="The official percentage indicating severity of disability. The tax allowance increases with the grade: GdB 25-30 → €384, GdB 35-40 → €620, GdB 45-50 → €860, GdB 55-60 → €1,140, GdB 65-70 → €1,440, GdB 75-80 → €1,780, GdB 85-90 → €2,120, GdB 95-100 → €2,840."
                                germanTerm="Grad der Behinderung (GdB)"
                                whereToFind="Stated on your Schwerbehindertenausweis (disability ID card) issued by the Versorgungsamt."
                            />
                        </label>
                        <select
                            {...register('disabilityGrade', { valueAsNumber: true })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        >
                            {[25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((g) => (
                                <option key={g} value={g}>GdB {g}</option>
                            ))}
                        </select>
                    </div>
                )}
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
