import { useForm, useWatch } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { DeductionsData } from '../../types/tax'
import AIHint from '../AIHint'
import AmountToggle, { useAmountMode } from '../AmountToggle'
import CapIndicator from '../CapIndicator'
import FieldHint from '../FieldHint'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function Deductions({ onNext, onBack }: Props) {
    const { deductions, updateDeductions, personal } = useTaxStore()
    const { register, handleSubmit, control } = useForm<DeductionsData>({ defaultValues: deductions })
    const { mode, setMode, toAnnual } = useAmountMode()
    const unit = mode === 'monthly' ? '€/month' : '€/year'

    const homeOfficeDays = useWatch({ control, name: 'homeOfficeDays' }) || 0
    const commuteKm = useWatch({ control, name: 'commuteKm' }) || 0
    const commuteDays = useWatch({ control, name: 'commuteDays' }) || 0
    const commuteTotal = Math.round(commuteKm * commuteDays * 0.38)

    const homeOfficeType = useWatch({ control, name: 'homeOfficeType' }) || 'pauschale'
    const arbeitszimmerMittelpunkt = useWatch({ control, name: 'arbeitszimmerMittelpunkt' }) || false
    const apartmentSqm = useWatch({ control, name: 'apartmentSqm' }) || 0
    const officeSqm = useWatch({ control, name: 'officeSqm' }) || 0
    const monthlyWarmRent = useWatch({ control, name: 'monthlyWarmRent' }) || 0
    const yourRentSharePct = useWatch({ control, name: 'yourRentSharePct' }) || 100
    const arbeitszimmerStartMonth = useWatch({ control, name: 'arbeitszimmerStartMonth' }) || 1

    const isTeacher = personal.occupationType === 'teacher_civil_servant'

    // Live arbeitszimmer deduction preview
    const monthsActive = 13 - (arbeitszimmerStartMonth || 1)  // 1–12
    const arbeitszimmerAnnual = apartmentSqm > 0 && officeSqm > 0
        ? Math.round((officeSqm / apartmentSqm) * monthlyWarmRent * monthsActive * (yourRentSharePct / 100))
        : 0
    const jahrespauschale = 1_260
    const jahrespauschaleProrated = Math.round(jahrespauschale * monthsActive / 12)
    const arbeitszimmerUsed = Math.max(arbeitszimmerAnnual, jahrespauschaleProrated)

    function onSubmit(data: DeductionsData) {
        updateDeductions({
            ...data,
            workEquipment: toAnnual(data.workEquipment || 0),
            workTraining: toAnnual(data.workTraining || 0),
            unionFees: toAnnual(data.unionFees || 0),
            otherWorkExpenses: data.otherWorkExpenses || 0,
            lossCarryForward: data.lossCarryForward || 0,
            teacherMaterials: toAnnual(data.teacherMaterials || 0),
            doubleHouseholdCostsPerMonth: data.doubleHouseholdCostsPerMonth || 0,
            doubleHouseholdMonths: data.doubleHouseholdMonths || 0,
            yourRentSharePct: data.yourRentSharePct || 100,
            apartmentSqm: data.apartmentSqm || 0,
            officeSqm: data.officeSqm || 0,
            monthlyWarmRent: data.monthlyWarmRent || 0,
            arbeitszimmerStartMonth: data.arbeitszimmerStartMonth || 1,
        })
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="font-heading font-semibold text-xl text-gray-800 dark:text-slate-200">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 20"
                    />
                    <p className="text-xs text-gray-400 mt-1">€0.38/km × commute days (2026 unified rate from km 1)</p>
                    <CapIndicator
                        current={commuteTotal}
                        max={4_500}
                        label="Commute deduction cap"
                        unit="€"
                    />
                </div>

                {/* Commute days */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 180"
                    />
                </div>

                {/* Home office */}
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Home Office Type
                        <FieldHint
                            explanation="You can either claim the flat-rate Homeoffice-Pauschale (€6/day, no dedicated room needed) or — if your home is your primary workplace — deduct the actual proportional rent for a dedicated home office room (Häusliches Arbeitszimmer)."
                            germanTerm="Homeoffice-Pauschale vs. Häusliches Arbeitszimmer"
                            whereToFind="If you have a separate enclosed room used almost exclusively for work and your home is the centre of your professional activity, the Arbeitszimmer option may save you more."
                        />
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <label className="flex-1 flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-600/10 transition-colors">
                            <input type="radio" value="pauschale" {...register('homeOfficeType')} className="mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Daily flat rate (Homeoffice-Pauschale)</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">€6/day, up to 210 days — no dedicated room needed, easiest to claim</p>
                            </div>
                        </label>
                        <label className="flex-1 flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-600/10 transition-colors">
                            <input type="radio" value="arbeitszimmer" {...register('homeOfficeType')} className="mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Dedicated room (Häusliches Arbeitszimmer)</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Proportional rent deduction — only if home is the centre of your work</p>
                            </div>
                        </label>
                    </div>

                    {/* Daily pauschale branch */}
                    {homeOfficeType !== 'arbeitszimmer' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                Home Office Days per Year
                                <FieldHint
                                    explanation="Days you worked entirely from home. You can claim €6 per day (maximum 210 days = €1,260/year). You cannot claim the commute deduction and home-office deduction for the same day."
                                    germanTerm="Homeoffice-Pauschale"
                                    whereToFind="Your own records — calendar, HR system, or timesheet."
                                />
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={210}
                                step={1}
                                {...register('homeOfficeDays', { valueAsNumber: true, min: 0, max: 210 })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="e.g. 80"
                            />
                            <p className="text-xs text-gray-400 mt-1">€6/day, maximum 210 days (€1,260/year)</p>
                            <CapIndicator current={homeOfficeDays} max={210} label="Home office cap" unit="days" />
                            <AIHint term="Homeoffice-Pauschale" />
                        </div>
                    )}

                    {/* Arbeitszimmer branch */}
                    {homeOfficeType === 'arbeitszimmer' && (
                        <div className="space-y-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">// Häusliches Arbeitszimmer — §9 Abs.5 EStG</p>
                                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                    A dedicated home office room is only deductible if it is the <strong>Mittelpunkt</strong> (centre) of all your professional activity — meaning the majority of your core tasks happen there. Most regular employees and teachers do <em>not</em> qualify; school is usually the Mittelpunkt for teachers.
                                </p>
                            </div>

                            {/* Mittelpunkt confirmation */}
                            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                                <input type="checkbox" {...register('arbeitszimmerMittelpunkt')} className="rounded mt-0.5" />
                                <span>
                                    My home office is the <strong>Mittelpunkt</strong> of all my professional activity — the majority of my core work tasks happen there (e.g. freelancer, writer, consultant without employer desk)
                                    <FieldHint
                                        explanation="'Mittelpunkt' means your home is the absolute professional centre — where the most important and time-consuming work tasks occur. Simply working from home some days is NOT enough. If your employer provides a desk or you regularly attend a school/office, your home is NOT the Mittelpunkt."
                                        germanTerm="Mittelpunkt der beruflichen Tätigkeit"
                                        whereToFind="Assess honestly: do more than 50% of your core job tasks happen at home? Is there no primary external workplace that dominates? If unsure, stick to the daily Pauschale to avoid audit risk."
                                    />
                                </span>
                            </label>

                            {arbeitszimmerMittelpunkt && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Total Apartment Size (m²)
                                            <FieldHint
                                                explanation="The total floor area of your entire apartment, including all rooms, bathroom, kitchen, and hallway. This is used to calculate what proportion of your rent belongs to the office."
                                                germanTerm="Gesamtfläche der Wohnung"
                                                whereToFind="Your rental contract (Mietvertrag) states the total Wohnfläche."
                                            />
                                        </label>
                                        <input
                                            type="number" min={0} max={1000} step="any"
                                            {...register('apartmentSqm', { valueAsNumber: true, min: 0 })}
                                            className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                            placeholder="e.g. 75"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Office Room Size (m²)
                                            <FieldHint
                                                explanation="The floor area of the dedicated office room only. It must be an enclosed, separate room used almost exclusively for work (>90%). A desk in the bedroom or living room does not qualify."
                                                germanTerm="Fläche des Arbeitszimmers"
                                                whereToFind="Measure the room or check your floor plan. Must match what you'd show on a floor plan to the Finanzamt."
                                            />
                                        </label>
                                        <input
                                            type="number" min={0} max={500} step="any"
                                            {...register('officeSqm', { valueAsNumber: true, min: 0 })}
                                            className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                            placeholder="e.g. 12"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Monthly Warm Rent (€)
                                            <FieldHint
                                                explanation="The total monthly payment including base cold rent (Kaltmiete) plus all service charges (Nebenkosten): heating, electricity, water, waste collection, property tax passed on by landlord, building insurance. The full Warmmiete is used for the pro-rata calculation."
                                                germanTerm="Warmmiete inkl. Nebenkosten"
                                                whereToFind="Your monthly bank transfer amount or the total on your rent invoice (Mietrechnung). Include all Nebenkosten listed in your Mietvertrag."
                                            />
                                        </label>
                                        <input
                                            type="number" min={0} step="any"
                                            {...register('monthlyWarmRent', { valueAsNumber: true, min: 0 })}
                                            className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                            placeholder="e.g. 1200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Your Share of the Rent (%)
                                            <FieldHint
                                                explanation="If you pay 100% of the rent yourself, enter 100. If you share the apartment with a partner (unmarried, separate tax filings), enter your actual share — e.g. 50 for a 50/50 split. You can only deduct the portion you personally paid. Unmarried partners file separately and each claims their own share."
                                                germanTerm="Ihr Mietanteil (bei geteilter Miete)"
                                                whereToFind="Check your rental contract or bank statements. If you pay equally with a partner, use 50. If you pay the full rent alone, use 100."
                                            />
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number" min={1} max={100} step={1}
                                                {...register('yourRentSharePct', { valueAsNumber: true, min: 1, max: 100 })}
                                                className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                                placeholder="100"
                                            />
                                            <span className="text-sm text-gray-500">%</span>
                                        </div>
                                        {(yourRentSharePct ?? 100) < 100 && (
                                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                                ⚠ Shared rent — you can only claim your {yourRentSharePct}% share. Your partner files their own separate claim.
                                            </p>
                                        )}
                                    </div>

                                    {/* Start month */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Started using this room for work in
                                            <FieldHint
                                                explanation="If you set up or rented the dedicated office room partway through 2026, select the month it was first used for work. The deduction is prorated to only the months the room was in use. If you used it all year, leave this as January."
                                                germanTerm="Beginn der Nutzung des Arbeitszimmers"
                                                whereToFind="Check your rental contract start date or the date you first used the room exclusively for work."
                                            />
                                        </label>
                                        <select
                                            {...register('arbeitszimmerStartMonth', { valueAsNumber: true })}
                                            className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-sn-card"
                                        >
                                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                                                <option key={i + 1} value={i + 1}>{m} ({13 - (i + 1)} month{13 - (i + 1) !== 1 ? 's' : ''})</option>
                                            ))}
                                        </select>
                                        {(arbeitszimmerStartMonth || 1) > 1 && (
                                            <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
                                                Deduction prorated to {monthsActive} month{monthsActive !== 1 ? 's' : ''} (started {['January','February','March','April','May','June','July','August','September','October','November','December'][(arbeitszimmerStartMonth || 1) - 1]})
                                            </p>
                                        )}
                                    </div>
                                    {apartmentSqm > 0 && officeSqm > 0 && monthlyWarmRent > 0 && (
                                        <div className="sm:col-span-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-3">
                                            <p className="font-mono text-[10px] uppercase tracking-widest text-green-700 dark:text-green-400 mb-1">// Live calculation</p>
                                            <p className="text-sm text-green-800 dark:text-green-300">
                                                Office ratio: <strong>{((officeSqm / apartmentSqm) * 100).toFixed(1)}%</strong>
                                                {' '}({officeSqm} m² ÷ {apartmentSqm} m²)
                                            </p>
                                            {monthsActive < 12 && (
                                                <p className="text-sm text-green-800 dark:text-green-300">
                                                    Months active: <strong>{monthsActive} of 12</strong>
                                                </p>
                                            )}
                                            <p className="text-sm text-green-800 dark:text-green-300">
                                                Proportional rent ({monthsActive} month{monthsActive !== 1 ? 's' : ''}): <strong>€{arbeitszimmerAnnual.toLocaleString('de-DE')}</strong>
                                                {(yourRentSharePct ?? 100) < 100 && ` (${yourRentSharePct}% share)`}
                                            </p>
                                            <p className="text-sm font-semibold text-green-800 dark:text-green-200 mt-1">
                                                → Deduction used: <strong>€{arbeitszimmerUsed.toLocaleString('de-DE')}</strong>
                                                {arbeitszimmerAnnual < jahrespauschaleProrated && ` (prorated Jahrespauschale €${jahrespauschaleProrated.toLocaleString('de-DE')} applies)`}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Audit tip: keep your rental contract, floor plan, and bank statements</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Work equipment */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Work Equipment             ({unit})
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Desk, laptop, monitor, headset (items ≤ €952 deducted in full)</p>
                </div>

                {/* Work training */ }
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Courses, professional books, seminars — must be work-related</p>
                </div>

                {/* Union fees */ }
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Gewerkschaftsbeiträge — 100% deductible, no cap</p>
                </div>

                {/* Other work expenses */ }
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Work clothing, application costs, professional insurances, etc.</p>
                </div>

                {/* ── Teacher / Civil-servant section ──────────────────────────── */ }
                {
                    isTeacher && (
                        <div className="sm:col-span-2">
                            <div className="relative overflow-hidden rounded-xl border border-sn-cyan/30 dark:border-sn-cyan/20 bg-gradient-to-r from-cyan-50 to-white dark:from-sn-surface dark:to-sn-card p-4 space-y-4">
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sn-cyan rounded-l-xl" />
                                <div className="pl-2">
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-sn-cyan dark:text-cyan-400 mb-1">// Lehrer &amp; Beamte — §9 EStG</p>
                                    <p className="text-sm font-heading font-semibold text-gray-800 dark:text-slate-200 mb-0.5">Teacher &amp; Civil-Servant Deductions</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        These deductions are specific to teachers and civil servants. Enter annual totals.
                                    </p>
                                </div>

                                <div className="pl-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Teaching materials */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Teaching Materials ({unit})
                                            <FieldHint
                                                explanation="Costs for materials you buy for teaching — books, worksheets, laminators, laminating foil, A4 paper, stationery, classroom supplies, digital tools, subscriptions for educational platforms. 100% deductible with no cap. Items >€952 (net) must be depreciated, otherwise deducted in full."
                                                germanTerm="Unterrichtsmaterialien / Lehrermittel"
                                                whereToFind="Receipts from bookshops, stationery shops, and online purchases. Keep all receipts — the Finanzamt may ask to see them."
                                            />
                                        </label>
                                        <input
                                            type="number" min={0} step="any"
                                            {...register('teacherMaterials', { valueAsNumber: true, min: 0 })}
                                            className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Books, worksheets, laminators, class supplies — 100% deductible, no cap</p>
                                    </div>

                                    {/* Double household */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Double Household Cost / Month (€)
                                            <FieldHint
                                                explanation="If you maintain a second home near your workplace (e.g. during teacher training, secondment, or a distant posting), the accommodation costs for that second home are deductible up to €1,000/month. This covers rent, Nebenkosten, and furnishing costs for the second home only."
                                                germanTerm="Doppelte Haushaltsführung (§9 Abs.1 Nr.5 EStG)"
                                                whereToFind="Rental contract and bank statements for your second home. The cap is €1,000/month regardless of actual costs above that."
                                            />
                                        </label>
                                        <input
                                            type="number" min={0} max={1500} step="any"
                                            {...register('doubleHouseholdCostsPerMonth', { valueAsNumber: true, min: 0, max: 1500 })}
                                            className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Capped at €1,000/month (§9 Abs.1 Nr.5 EStG)</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            Double Household Months
                                            <FieldHint
                                                explanation="How many months in the tax year did you maintain the second home near your work location? Enter 0 if you did not have a double household."
                                                germanTerm="Monate der doppelten Haushaltsführung"
                                                whereToFind="Count the months from your rental contract start date to end date (or end of the year, whichever comes first)."
                                            />
                                        </label>
                                        <input
                                            type="number" min={0} max={12} step={1}
                                            {...register('doubleHouseholdMonths', { valueAsNumber: true, min: 0, max: 12 })}
                                            className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="pl-2">
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        <strong>Teacher tip:</strong> Also enter class trip km and Verpflegungsmehraufwand in Other Work Expenses above. Union fees (GEW etc.) go in the Union Fees field. School is your <em>erste Tätigkeitsstätte</em>, so commute uses the €0.38/km Pendlerpauschale.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Loss carry-forward */ }
                <div className="sm:col-span-2">
                    <div className="relative overflow-hidden rounded-xl border border-brand-600/20 dark:border-brand-600/30 bg-gradient-to-r from-brand-50 to-white dark:from-sn-surface dark:to-sn-card p-4">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-600 rounded-l-xl" />
                        <div className="pl-2">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-1">
                                            // §10d EStG — optional
                            </p>
                            <label className="block text-sm font-heading font-semibold text-gray-800 dark:text-slate-200 mb-1">
                                Prior-Year Loss Carry-Forward
                                <FieldHint
                                    explanation="If you had unclaimed losses in prior years — e.g. from self-employment or rental activity — the Finanzamt may have issued a Verlustfeststellungsbescheid. This loss can be deducted from your current-year taxable income under §10d EStG."
                                    germanTerm="Verlustvortrag (§10d EStG)"
                                    whereToFind="Your Verlustfeststellungsbescheid from the Finanzamt (the annual letter confirming your carried-forward loss balance). Enter the amount you wish to apply this year."
                                />
                            </label>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                                Only enter this if the Finanzamt issued you a Verlustfeststellungsbescheid for a prior year.
                            </p>
                            <input
                                type="number"
                                min={0}
                                step="any"
                                {...register('lossCarryForward', { valueAsNumber: true, min: 0 })}
                                className="w-full sm:w-64 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                placeholder="0"
                            />
                            <p className="font-mono text-[10px] text-gray-400 dark:text-slate-500 mt-2">
                                Reduces ZVE directly — §10d EStG Verlustvortrag
                            </p>
                        </div>
                    </div>
                </div>
                        </div >

                    <div className="flex justify-between">
                        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                            ← Back
                        </button>
                        <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700">
                            Next →
                        </button>
                    </div>
                    </form >
                )
            }
