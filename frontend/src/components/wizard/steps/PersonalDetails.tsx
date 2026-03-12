import { zodResolver } from '@hookform/resolvers/zod'
import { Baby, Church, Globe, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useWizardStore } from '../../../lib/store'
import AIHint from '../../AIHint'

const schema = z.object({
    taxYear: z.number().int().min(2020).max(2030),
    isMarried: z.boolean(),
    numChildren: z.number().int().min(0).max(20),
    isChurchMember: z.boolean(),
    churchTaxRateType: z.enum(['high', 'low']),
    isFullYearResident: z.boolean(),
    isDisabled: z.boolean(),
    disabilityGrade: z.number().int().min(0).max(100),
})
type FormValues = z.infer<typeof schema>

interface Props { onNext: () => void }

export default function PersonalDetails({ onNext }: Props) {
    const { personal, updatePersonal } = useWizardStore()
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: personal,
    })

    const isChurchMember = watch('isChurchMember')
    const isDisabled = watch('isDisabled')

    function onSubmit(data: FormValues) {
        updatePersonal(data)
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="wizard-step space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-500 mb-1">About You</h2>
                <p className="text-slate-500 text-sm">Tell us the basics so we can personalise your tax return.</p>
            </div>

            {/* Tax year */}
            <div>
                <label className="label flex items-center gap-1">
                    Tax Year
                    <AIHint term="Steuerjahr" label="Tax Year" />
                </label>
                <select className="input-field" {...register('taxYear', { valueAsNumber: true })}>
                    <option value={2026}>2026 (filing for income earned in 2025)</option>
                    <option value={2025}>2025 (filing for income earned in 2024)</option>
                </select>
                <p className="hint-text">You file taxes for the previous year — e.g. in 2026 you file for 2025.</p>
            </div>

            {/* Marital status */}
            <div>
                <label className="label flex items-center gap-2">
                    <Users size={16} className="text-brand-400" />
                    Are you married or in a civil partnership?
                    <AIHint term="Zusammenveranlagung" label="Joint Assessment" />
                </label>
                <div className="flex gap-3">
                    {[
                        { value: false, label: 'Single / Not married', emoji: '👤' },
                        { value: true, label: 'Married / Civil partnership', emoji: '💑' },
                    ].map(({ value, label, emoji }) => (
                        <label
                            key={String(value)}
                            className="flex-1 cursor-pointer"
                        >
                            <input type="radio" className="sr-only" {...register('isMarried')}
                                value={String(value)} defaultChecked={personal.isMarried === value}
                                onChange={() => { }} />
                            <div
                                className={`border-2 rounded-xl p-4 text-center transition-all hover:border-brand-400 ${personal.isMarried === value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
                                    }`}
                                onClick={() => updatePersonal({ isMarried: value as boolean })}
                            >
                                <div className="text-2xl mb-1">{emoji}</div>
                                <div className="text-sm font-medium text-slate-700">{label}</div>
                            </div>
                        </label>
                    ))}
                </div>
                <p className="hint-text">Married couples can file jointly (Zusammenveranlagung), which often gives a significantly lower tax bill.</p>
            </div>

            {/* Children */}
            <div>
                <label className="label flex items-center gap-2">
                    <Baby size={16} className="text-brand-400" />
                    How many dependent children do you have?
                    <AIHint term="Kinderfreibetrag" label="Child Tax Allowance" />
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="number"
                        min={0}
                        max={20}
                        className="input-field w-28"
                        {...register('numChildren', { valueAsNumber: true })}
                    />
                    <span className="text-sm text-slate-600">children (under 18, or in education up to 25)</span>
                </div>
                <p className="hint-text">Each child qualifies for Kindergeld (€259/month) or the Kinderfreibetrag — whichever is more beneficial for you.</p>
            </div>

            {/* Church membership */}
            <div>
                <label className="label flex items-center gap-2">
                    <Church size={16} className="text-brand-400" />
                    Are you a registered member of a church? (Catholic, Protestant, Jewish community, etc.)
                    <AIHint term="Kirchensteuer" label="Church Tax" />
                </label>
                <div className="flex gap-3">
                    {[
                        { value: false, label: 'No church membership' },
                        { value: true, label: 'Yes, church member' },
                    ].map(({ value, label }) => (
                        <label key={String(value)} className="flex-1 cursor-pointer">
                            <input type="radio" className="sr-only" {...register('isChurchMember')}
                                onChange={() => updatePersonal({ isChurchMember: value as boolean })} />
                            <div
                                className={`border-2 rounded-xl p-3 text-center transition-all text-sm font-medium cursor-pointer ${personal.isChurchMember === value
                                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                                onClick={() => updatePersonal({ isChurchMember: value as boolean })}
                            >
                                {label}
                            </div>
                        </label>
                    ))}
                </div>

                {isChurchMember && (
                    <div className="mt-3">
                        <label className="label">Which state (Bundesland) do you live in?</label>
                        <select
                            className="input-field"
                            {...register('churchTaxRateType')}
                            onChange={(e) => updatePersonal({ churchTaxRateType: e.target.value as 'high' | 'low' })}
                        >
                            <option value="high">Most German states (9% church tax)</option>
                            <option value="low">Bavaria (Bayern) or Baden-Württemberg (8% church tax)</option>
                        </select>
                    </div>
                )}
                {isChurchMember && (
                    <p className="hint-text">Church tax (Kirchensteuer) is 8% or 9% of your income tax bill.</p>
                )}
            </div>

            {/* Residency */}
            <div>
                <label className="label flex items-center gap-2">
                    <Globe size={16} className="text-brand-400" />
                    Were you tax-resident in Germany for the full year?
                </label>
                <div className="flex gap-3">
                    {[
                        { value: true, label: 'Yes — full year in Germany' },
                        { value: false, label: 'No — partial year or split residency' },
                    ].map(({ value, label }) => (
                        <div
                            key={String(value)}
                            className={`flex-1 border-2 rounded-xl p-3 text-center text-sm font-medium cursor-pointer transition-all ${personal.isFullYearResident === value
                                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            onClick={() => updatePersonal({ isFullYearResident: value as boolean })}
                        >
                            {label}
                        </div>
                    ))}
                </div>
                {!personal.isFullYearResident && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        Partial-year residency and split situations can be complex. This calculator handles standard cases — for foreign income or treaty situations, consider a tax advisor (Steuerberater).
                    </p>
                )}
            </div>

            <div className="pt-2">
                <button type="submit" className="btn-primary w-full py-3.5 text-base">
                    Continue →
                </button>
            </div>
        </form>
    )
}
