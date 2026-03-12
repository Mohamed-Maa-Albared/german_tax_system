import { Baby, BookOpen, HandHeart, Heart, Shield, Stethoscope } from 'lucide-react';
import { useWizardStore } from '../../../lib/store';
import AIHint from '../../AIHint';

interface Props { onNext: () => void; onBack: () => void }

const EuroInput = ({ value, onChange, placeholder = '0' }: { value: number; onChange: (v: number) => void; placeholder?: string }) => (
    <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
        <input
            type="number" min={0} step={10}
            className="input-field pl-8"
            placeholder={placeholder}
            value={value || ''}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
    </div>
)

export default function SpecialExpenses({ onNext, onBack }: Props) {
    const { specialExpenses, updateSpecialExpenses, taxParams, personal } = useWizardStore()
    const upd = (field: string, value: number) => updateSpecialExpenses({ [field]: value } as any)

    return (
        <div className="wizard-step space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-500 mb-1">Special Expenses & Insurance</h2>
                <p className="text-slate-500 text-sm">
                    These are deductible from your taxable income. Leave fields at 0 if they don't apply.
                </p>
            </div>

            {/* Insurance */}
            <div className="card p-4 space-y-4">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <Shield size={18} className="text-brand-400" />
                    Insurance premiums (Versicherungsbeiträge)
                    <AIHint term="Sonderausgaben" label="Special Expenses deduction" />
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="label">Health insurance (Krankenversicherung) annual premium</label>
                        <EuroInput value={specialExpenses.healthInsurance} onChange={v => upd('healthInsurance', v)} placeholder="e.g. 3000" />
                        <p className="hint-text">The basic coverage portion is fully deductible. Check your annual insurance statement.</p>
                    </div>
                    <div>
                        <label className="label">Long-term care insurance (Pflegeversicherung)</label>
                        <EuroInput value={specialExpenses.longTermCareInsurance} onChange={v => upd('longTermCareInsurance', v)} placeholder="e.g. 600" />
                    </div>
                </div>
            </div>

            {/* Pension */}
            <div className="card p-4 space-y-4">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <BookOpen size={18} className="text-brand-400" />
                    Pension contributions
                    <AIHint term="Altersvorsorgeaufwendungen" label="Pension / Retirement savings" />
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="label">Statutory pension (gesetzliche Rentenversicherung) contributions you paid</label>
                        <EuroInput value={specialExpenses.pensionContributions} onChange={v => upd('pensionContributions', v)} placeholder="e.g. 5000" />
                        <p className="hint-text">Usually shown on your Lohnsteuerbescheinigung. Max deductible: {specialExpenses.pensionContributions > 0 ? '' : `€${taxParams.max_pension_deduction_single.toLocaleString()}`} (single).</p>
                    </div>
                    <div>
                        <label className="label flex items-center gap-1">
                            Riester pension contributions
                            <AIHint term="Riester-Rente" label="Riester pension plan" />
                        </label>
                        <EuroInput value={specialExpenses.riesterContributions} onChange={v => upd('riesterContributions', v)} placeholder="0" />
                    </div>
                </div>
            </div>

            {/* Donations */}
            <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <HandHeart size={18} className="text-brand-400" />
                    Donations (Spenden)
                </div>
                <div>
                    <label className="label">Total charitable donations (to recognised charities/organisations)</label>
                    <EuroInput value={specialExpenses.donations} onChange={v => upd('donations', v)} placeholder="0" />
                    <p className="hint-text">Up to 20% of your gross income is deductible. Keep your Spendenquittung (receipt).</p>
                </div>
            </div>

            {/* Childcare — only show if children */}
            {personal.numChildren > 0 && (
                <div className="card p-4 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <Baby size={18} className="text-brand-400" />
                        Childcare costs (Kinderbetreuungskosten)
                        <AIHint term="Kinderbetreuungskosten" label="Childcare deduction" />
                    </div>
                    <div>
                        <label className="label">Total childcare costs paid</label>
                        <EuroInput value={specialExpenses.childcareCosts} onChange={v => upd('childcareCosts', v)} placeholder="e.g. 4000" />
                        <p className="hint-text">
                            80% is deductible, max {personal.numChildren === 1
                                ? `€${taxParams.childcare_max_per_child.toLocaleString()}`
                                : `€${(taxParams.childcare_max_per_child * personal.numChildren).toLocaleString()} (${personal.numChildren} children)`
                            } per year. Applies to children under 14 in official daycare/nursery/Kita.
                        </p>
                    </div>
                </div>
            )}

            {/* Medical */}
            <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <Stethoscope size={18} className="text-brand-400" />
                    Medical & extraordinary costs
                    <AIHint term="Außergewöhnliche Belastungen" label="Extraordinary Burdens" />
                </div>
                <div>
                    <label className="label">Out-of-pocket medical costs not covered by insurance</label>
                    <EuroInput value={specialExpenses.medicalCosts} onChange={v => upd('medicalCosts', v)} placeholder="0" />
                    <p className="hint-text">Only the amount <em>above</em> the reasonable burden threshold (typically 4–7% of income) is deductible.</p>
                </div>
                <div>
                    <label className="label flex items-center gap-1">
                        Alimony paid to ex-spouse (Unterhalt / Realsplitting)
                        <AIHint term="Realsplitting" label="Alimony tax deduction" />
                    </label>
                    <EuroInput value={specialExpenses.alimonyPaid} onChange={v => upd('alimonyPaid', v)} placeholder="0" />
                    <p className="hint-text">Max deductible: €{taxParams.alimony_max.toLocaleString()} per year. Recipient must declare it as income.</p>
                </div>
            </div>

            {/* Church fees */}
            {personal.isChurchMember && (
                <div className="card p-4 space-y-3">
                    <Heart size={18} className="text-brand-400 inline mr-2" />
                    <span className="font-semibold text-slate-700">Church membership fees (Kirchenbeitrag)</span>
                    <div>
                        <label className="label">Additional church fees beyond the withheld Kirchensteuer</label>
                        <EuroInput value={specialExpenses.churchFeesPaid} onChange={v => upd('churchFeesPaid', v)} placeholder="0" />
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onBack} className="btn-ghost flex-1 border border-slate-200">← Back</button>
                <button type="button" onClick={onNext} className="btn-primary flex-1">Continue →</button>
            </div>
        </div>
    )
}
