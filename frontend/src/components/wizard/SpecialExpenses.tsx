import { useForm, useWatch } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { SpecialExpensesData } from '../../types/tax'
import AIHint from '../AIHint'
import AmountToggle, { useAmountMode } from '../AmountToggle'
import CapIndicator from '../CapIndicator'
import FieldHint from '../FieldHint'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function SpecialExpenses({ onNext, onBack }: Props) {
    const { specialExpenses, updateSpecialExpenses } = useTaxStore()
    const { register, handleSubmit, control } = useForm<SpecialExpensesData>({
        defaultValues: specialExpenses,
    })
    const { mode, setMode, toAnnual } = useAmountMode()
    const unit = mode === 'monthly' ? '€/month' : '€/year'

    // Watch values for real-time cap indicators
    const pension = useWatch({ control, name: 'pensionContributions' }) || 0
    const riester = useWatch({ control, name: 'riesterContributions' }) || 0
    const alimony = useWatch({ control, name: 'alimonyPaid' }) || 0
    const childcare = useWatch({ control, name: 'childcareCosts' }) || 0
    const { personal } = useTaxStore()
    const isJoint = personal.isMarried
    const numChildren = personal.numChildren
    const isBeamte = personal.occupationType === 'teacher_civil_servant'
    const riesterCap = isJoint ? 4_200 : 2_100
    const pensionCap = isJoint ? 61_652 : 30_826
    // Childcare: entered as total for all children, cap is per-child €6,000 actual (§10 EStG)
    const childcareCap = numChildren > 0 ? numChildren * 6_000 : 6_000

    function onSubmit(data: SpecialExpensesData) {
        updateSpecialExpenses({
            pensionContributions: toAnnual(data.pensionContributions),
            healthInsuranceContributions: toAnnual(data.healthInsuranceContributions),
            longTermCareInsurance: toAnnual(data.longTermCareInsurance ?? 0),
            riesterContributions: toAnnual(data.riesterContributions),
            donations: toAnnual(data.donations),
            alimonyPaid: toAnnual(data.alimonyPaid),
            churchTaxPriorYear: toAnnual(data.churchTaxPriorYear),
            childcareCosts: toAnnual(data.childcareCosts),
            medicalCosts: toAnnual(data.medicalCosts ?? 0),
        })
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="font-heading font-semibold text-xl text-gray-800 dark:text-slate-200">
                        Special Expenses <span className="text-sm font-normal text-gray-500">(Sonderausgaben)</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Leave at 0 if not applicable — a minimum flat-rate of €36/year (€72 joint) is applied automatically.
                    </p>
                </div>
                <div className="self-start sm:self-center pt-1 sm:pt-0">
                    <AmountToggle mode={mode} onChange={setMode} />
                </div>
            </div>

            {/* ── Beamte PKV + 2026 warning ─────────────────────────────────── */}
            {isBeamte && (
                <div className="space-y-3">
                    {/* PKV full premium note */}
                    <div className="relative overflow-hidden rounded-xl border border-sn-cyan/30 dark:border-sn-cyan/20 bg-cyan-50/60 dark:bg-cyan-950/20 p-4">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sn-cyan rounded-l-xl" />
                        <div className="pl-2">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-sn-cyan mb-1">
                                // PKV — Beamte rule
                            </p>
                            <p className="text-xs font-semibold text-cyan-900 dark:text-cyan-200 mb-0.5">
                                Enter your FULL private health insurance premium
                            </p>
                            <p className="text-xs text-cyan-800 dark:text-cyan-300/80 leading-relaxed">
                                As a Beamter/Beamtin, there is no employer contribution to your PKV premium — you pay the
                                entire amount yourself. Your <strong>full annual PKV premium</strong> is deductible under
                                §10 Abs.1 Nr.3 EStG. Enter the total from your annual PKV invoice, not just an employee share.
                            </p>
                        </div>
                    </div>
                    {/* 2026 Mindestvorsorgepauschale warning */}
                    <div className="relative overflow-hidden rounded-xl border border-amber-300/60 dark:border-amber-600/30 bg-amber-50 dark:bg-amber-950/20 p-4">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 dark:bg-amber-500 rounded-l-xl" />
                        <div className="pl-2">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-1">
                                // 2026 change
                            </p>
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-0.5">
                                Mindestvorsorgepauschale abolished — your monthly withholding may be higher this year
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                                Until 2025, Beamte with private insurance benefited from a simplified withholding rule
                                (Mindestvorsorgepauschale) that capped monthly Lohnsteuer deductions. This has been
                                replaced in 2026. Your employer now uses the actual deductible PKV premium for monthly
                                withholding — which may mean <strong>temporarily higher deductions</strong> until you file
                                your return. Filing your Einkommensteuererklärung will reconcile this and refund any
                                overpayment. This calculator already accounts for the full PKV deduction.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pension */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Pension Contributions ({unit})
                        <FieldHint
                            explanation="Contributions to the statutory pension insurance (Gesetzliche Rentenversicherung). As an employee you pay half; your employer pays the other half. Both halves are partly deductible. Up to €30,826 (single) / €61,652 (joint filing) is fully deductible in 2026."
                            germanTerm="Rentenversicherungsbeiträge"
                            whereToFind="Box 22a of your Lohnsteuerbescheinigung shows the employee's share. Double it to include the employer's share (which is also deductible)."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('pensionContributions', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <AIHint term="Rentenversicherung" />
                </div>

                {/* Health insurance */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Health Insurance Contributions ({unit})
                        <FieldHint
                            explanation={isBeamte
                                ? "As a Beamter/in, enter your FULL private health insurance (PKV) premium. There is no employer contribution — you pay 100% yourself, and 100% is deductible under §10 Abs.1 Nr.3 EStG. Use the total from your annual PKV invoice. Do not add a nursing care element here — enter that separately in the Nursing Care field below."
                                : "Premiums for your statutory (GKV) or private (PKV) health insurance covering basic health care. The basic contribution is 100% deductible. Sick-pay cover (Krankengeld) portion is not. For GKV members: your own share including the average supplemental premium."}
                            germanTerm="Krankenversicherungsbeiträge (§10 Abs.1 Nr.3 EStG)"
                            whereToFind={isBeamte
                                ? "Your annual PKV premium statement (Beitragsrechnung) from your private insurer. Use the total health component only — exclude the Pflegezusatz if listed separately."
                                : "Box 23 of your Lohnsteuerbescheinigung (for GKV members). For PKV, use your annual premium statement from your insurer."}
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('healthInsuranceContributions', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        {isBeamte ? 'Full PKV premium — 100% deductible (§10 EStG)' : 'GKV/PKV premiums — fully deductible (§10 EStG)'}
                    </p>
                </div>

                {/* Long-term care */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Nursing Care Insurance — Full Contribution ({unit})
                        <FieldHint
                            explanation="Your total annual contributions to the statutory nursing care insurance (Pflegeversicherung), including: (1) the base contribution — 3.4% of gross salary, half paid by you, half by employer; and (2) the childless surcharge — an extra 0.6% deducted from your pay only if you are 23 or older and have no children. Enter the sum of both employee-side amounts if applicable. The employer's half of the base contribution is also deductible — add it in too."
                            germanTerm="Pflegeversicherungsbeiträge inkl. Kinderlosenzuschlag"
                            whereToFind="Box 24 of your Lohnsteuerbescheinigung shows 'Arbeitnehmeranteil zur Pflegeversicherung' (your employee share). Add the employer's half of the base rate (shown in Box 25 or on your payslip as 'AG-Anteil Pflegeversicherung'). Do NOT add the childless surcharge twice — it is only on your side."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('longTermCareInsurance', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Base rate (both shares) + childless surcharge (0.6% if applicable) — fully deductible
                    </p>
                </div>

                {/* Riester */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Riester Pension Contributions ({unit})
                        <FieldHint
                            explanation="Contributions to a Riester pension contract — a German government-subsidised private pension. You can deduct up to €2,100/year (€4,200 for joint filing). You may also receive direct government subsidies (Zulagen)."
                            germanTerm="Riester-Beiträge (§10a EStG)"
                            whereToFind="Your annual statement from your Riester provider. The contribution certificate (Zulagebescheinigung) shows your total contributions and any government premiums received."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('riesterContributions', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Deductible up to €2,100/year (€4,200 joint filing)</p>
                    <CapIndicator
                        current={mode === 'monthly' ? riester * 12 : riester}
                        max={riesterCap}
                        label="Riester cap"
                        unit="€"
                    />
                </div>

                {/* Donations */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Charitable Donations ({unit})
                        <FieldHint
                            explanation="Donations to officially recognised charitable organisations (gemeinnützige Vereine, registered charities). Donations to political parties are also partially deductible. Capped at 20% of your total income."
                            germanTerm="Spenden und Mitgliedsbeiträge (§10b EStG)"
                            whereToFind="Donation receipts (Zuwendungsbestätigung / Spendenquittung) from the recipient organisation. For amounts up to €300, a bank statement suffices. Keep receipts for 10 years."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('donations', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Capped at 20% of your total income</p>
                </div>

                {/* Alimony */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Alimony / Maintenance Paid ({unit})
                        <FieldHint
                            explanation="Alimony paid to an ex-spouse (Realsplitting). Deductible up to €13,805/year, but only if your ex-spouse agrees to declare it as income (by signing Anlage U). Child support (Unterhalt for children) is NOT deductible here."
                            germanTerm="Unterhaltsleistungen an den geschiedenen Ehegatten (§10 EStG)"
                            whereToFind="Your bank statements or court-ordered payment records. Your ex-spouse must confirm receipt via Anlage U to the tax office."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('alimonyPaid', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Ex-spouse spousal support only (not child support). Max €13,805</p>
                    <CapIndicator
                        current={mode === 'monthly' ? alimony * 12 : alimony}
                        max={13_805}
                        label="Alimony cap"
                        unit="€"
                    />
                </div>

                {/* Childcare */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Childcare Costs ({unit})
                        <FieldHint
                            explanation="Costs for childcare for children under 14 — nursery (Kita), after-school care (Hort), nanny. 80% of actual costs are deductible, up to a maximum of €4,800 per child per year (i.e. max actual cost claimable is €6,000/child)."
                            germanTerm="Kinderbetreuungskosten (§10 EStG)"
                            whereToFind="Annual invoices from the nursery, Kita, or care provider. The Kita fee confirmation letter or annual statement. Payments must be by bank transfer (cash payments not accepted)."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('childcareCosts', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">80% deductible, max €4,800/child under 14 (§10 EStG)</p>
                    {numChildren > 0 && (
                        <CapIndicator
                            current={mode === 'monthly' ? childcare * 12 : childcare}
                            max={childcareCap}
                            label={`Childcare cap (${numChildren} child${numChildren !== 1 ? 'ren' : ''})`}
                            unit="€"
                        />
                    )}
                </div>

                {/* Medical costs */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Medical &amp; Healthcare Costs ({unit})
                        <FieldHint
                            explanation="Out-of-pocket medical expenses not covered by health insurance — prescription co-pays, glasses, dental treatment, physiotherapy, etc. Only the amount above your personal 'reasonable burden' threshold (zumutbare Belastung) is deductible. The threshold depends on your income and family situation — typically 1-7% of total income."
                            germanTerm="Außergewöhnliche Belastungen — Krankheitskosten (§33 EStG)"
                            whereToFind="Your receipts, pharmacy invoices, dentist bills, and prescription records. Keep all medical receipts throughout the year."
                        />
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="any"
                        {...register('medicalCosts', { valueAsNumber: true, min: 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Amount above your personal threshold is deductible (§33 EStG)
                    </p>
                    <AIHint term="Außergewöhnliche Belastungen" />
                </div>
            </div>

            <div className="flex justify-between">
                <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    ← Back
                </button>
                <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700">
                    Next →
                </button>
            </div>
        </form>
    )
}
