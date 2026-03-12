import { useWizardStore } from '../../../lib/store'
import { Car, Home, Package, GraduationCap } from 'lucide-react'
import AIHint from '../../AIHint'
import { formatEuro } from '../../../lib/utils'

interface Props { onNext: () => void; onBack: () => void }

export default function Deductions({ onNext, onBack }: Props) {
    const { deductions, updateDeductions, taxParams } = useWizardStore()
    function num(v: string) { return parseFloat(v) || 0 }

    const commuteDeduction = deductions.commuteKm * taxParams.pendlerpauschale_per_km * deductions.commuteDays
    const homeOfficeDeduction = Math.min(deductions.homeOfficeDays, taxParams.homeoffice_max_days) * taxParams.homeoffice_per_day
    const otherDeductions = deductions.workEquipment + deductions.workTraining + deductions.otherWorkExpenses + deductions.unionFees
    const totalActual = commuteDeduction + homeOfficeDeduction + otherDeductions
    const totalUsed = Math.max(totalActual, taxParams.werbungskosten_pauschale)

    return (
        <div className="wizard-step space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-500 mb-1">Work-Related Deductions</h2>
                <p className="text-slate-500 text-sm">
                    These are deducted directly from your taxable income. Even small amounts add up.
                    The minimum lump sum is <strong>{formatEuro(taxParams.werbungskosten_pauschale)}</strong> — we'll apply whichever is higher.
                </p>
            </div>

            {/* Commute */}
            <div className="card p-4 space-y-4">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <Car size={18} className="text-brand-400" />
                    Commute to work (Pendlerpauschale)
                    <AIHint term="Pendlerpauschale" label="Commute Deduction" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">One-way distance (km)</label>
                        <input type="number" min={0} max={500} className="input-field"
                            placeholder="e.g. 25"
                            value={deductions.commuteKm || ''}
                            onChange={e => updateDeductions({ commuteKm: num(e.target.value) })} />
                        <p className="hint-text">{formatEuro(taxParams.pendlerpauschale_per_km)}/km from km 1 (2026 rule)</p>
                    </div>
                    <div>
                        <label className="label">Days worked on-site</label>
                        <input type="number" min={0} max={366} className="input-field"
                            placeholder="e.g. 200"
                            value={deductions.commuteDays || ''}
                            onChange={e => updateDeductions({ commuteDays: parseInt(e.target.value) || 0 })} />
                        <p className="hint-text">Don't count home-office days</p>
                    </div>
                </div>
                {commuteDeduction > 0 && (
                    <div className="text-sm text-green-700 bg-green-50 rounded-lg p-2 flex justify-between">
                        <span>Commute deduction</span>
                        <span className="font-semibold">−{formatEuro(commuteDeduction)}</span>
                    </div>
                )}
            </div>

            {/* Home office */}
            <div className="card p-4 space-y-4">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <Home size={18} className="text-brand-400" />
                    Home office (Homeoffice-Pauschale)
                    <AIHint term="Homeoffice-Pauschale" label="Home Office Deduction" />
                </div>
                <div>
                    <label className="label">Days worked from home</label>
                    <input type="number" min={0} max={366} className="input-field w-36"
                        placeholder="e.g. 80"
                        value={deductions.homeOfficeDays || ''}
                        onChange={e => updateDeductions({ homeOfficeDays: parseInt(e.target.value) || 0 })} />
                    <p className="hint-text">
                        {formatEuro(taxParams.homeoffice_per_day)}/day, max {taxParams.homeoffice_max_days} days = {formatEuro(taxParams.homeoffice_per_day * taxParams.homeoffice_max_days)} maximum per year
                    </p>
                </div>
                {homeOfficeDeduction > 0 && (
                    <div className="text-sm text-green-700 bg-green-50 rounded-lg p-2 flex justify-between">
                        <span>Home office deduction</span>
                        <span className="font-semibold">−{formatEuro(homeOfficeDeduction)}</span>
                    </div>
                )}
            </div>

            {/* Work equipment */}
            <div className="card p-4 space-y-4">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <Package size={18} className="text-brand-400" />
                    Work equipment & other expenses
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="label">Work equipment (computer, desk, tools, etc.)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="0"
                                value={deductions.workEquipment || ''}
                                onChange={e => updateDeductions({ workEquipment: num(e.target.value) })} />
                        </div>
                        <p className="hint-text">Items used >90% for work can be fully deducted. Mixed use: only work-use portion.</p>
                    </div>

                    <div>
                        <label className="label flex items-center gap-1">
                            <GraduationCap size={14} /> Training & professional development
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="0"
                                value={deductions.workTraining || ''}
                                onChange={e => updateDeductions({ workTraining: num(e.target.value) })} />
                        </div>
                        <p className="hint-text">Courses, certifications, conferences, professional books and subscriptions.</p>
                    </div>

                    <div>
                        <label className="label">Union fees (Gewerkschaftsbeiträge)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="0"
                                value={deductions.unionFees || ''}
                                onChange={e => updateDeductions({ unionFees: num(e.target.value) })} />
                        </div>
                    </div>

                    <div>
                        <label className="label">Other work expenses</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="0"
                                value={deductions.otherWorkExpenses || ''}
                                onChange={e => updateDeductions({ otherWorkExpenses: num(e.target.value) })} />
                        </div>
                        <p className="hint-text">Work clothing, application costs, double housekeeping.</p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm">
                <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Your actual work expenses</span>
                    <span className={`font-medium ${totalActual >= taxParams.werbungskosten_pauschale ? 'text-green-600' : 'text-slate-700'}`}>
                        {formatEuro(totalActual)}
                    </span>
                </div>
                <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Lump sum (Pauschbetrag)</span>
                    <span className="font-medium text-slate-700">{formatEuro(taxParams.werbungskosten_pauschale)}</span>
                </div>
                <div className="flex justify-between border-t border-brand-200 pt-2 mt-1">
                    <span className="font-semibold text-brand-700">Amount used (higher of the two)</span>
                    <span className="font-bold text-brand-700">−{formatEuro(totalUsed)}</span>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onBack} className="btn-ghost flex-1 border border-slate-200">← Back</button>
                <button type="button" onClick={onNext} className="btn-primary flex-1">Continue →</button>
            </div>
        </div>
    )
}
