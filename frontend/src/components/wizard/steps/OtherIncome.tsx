import { Home, PenTool, TrendingUp } from 'lucide-react';
import { useWizardStore } from '../../../lib/store';
import AIHint from '../../AIHint';

interface Props { onNext: () => void; onBack: () => void }

export default function OtherIncome({ onNext, onBack }: Props) {
    const { otherIncome, updateOtherIncome } = useWizardStore()
    function num(val: string) { return parseFloat(val) || 0 }

    const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc: string }) => (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div>
                <span className="font-medium text-slate-800">{label}</span>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${value ? 'bg-brand-500' : 'bg-slate-300'}`}
            >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    )

    return (
        <div className="wizard-step space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-500 mb-1">Other Income Sources</h2>
                <p className="text-slate-500 text-sm">Do you have income beyond your regular salary? Toggle what applies to you.</p>
            </div>

            {/* Self-employed */}
            <Toggle
                value={otherIncome.hasSelfEmployed}
                onChange={(v) => updateOtherIncome({ hasSelfEmployed: v })}
                label="Self-employed / Freelance income (Selbständige Arbeit)"
                desc="Freelance work, consulting, writing, design, etc."
            />
            {otherIncome.hasSelfEmployed && (
                <div className="pl-4 border-l-2 border-brand-200 space-y-4 animate-fade-in">
                    <div>
                        <label className="label flex items-center gap-1">
                            <PenTool size={14} /> Annual revenue (Einnahmen)
                            <AIHint term="Einnahmen-Überschuss-Rechnung" label="EÜR — simple profit accounting" />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="e.g. 30000"
                                value={otherIncome.selfEmployedRevenue || ''}
                                onChange={e => updateOtherIncome({ selfEmployedRevenue: num(e.target.value) })} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Business expenses (Betriebsausgaben)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="e.g. 5000"
                                value={otherIncome.selfEmployedExpenses || ''}
                                onChange={e => updateOtherIncome({ selfEmployedExpenses: num(e.target.value) })} />
                        </div>
                        <p className="hint-text">Equipment, software, office costs, professional fees, etc.</p>
                    </div>
                    {otherIncome.selfEmployedRevenue > 0 && (
                        <div className="text-sm text-slate-600 bg-green-50 border border-green-100 rounded-lg p-3">
                            Net income: <strong className="text-green-700">€{Math.max(0, otherIncome.selfEmployedRevenue - otherIncome.selfEmployedExpenses).toLocaleString()}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* Investments */}
            <Toggle
                value={otherIncome.hasInvestments}
                onChange={(v) => updateOtherIncome({ hasInvestments: v })}
                label="Investment / dividend income (Kapitalvermögen)"
                desc="Dividends, interest, ETF distributions"
            />
            {otherIncome.hasInvestments && (
                <div className="pl-4 border-l-2 border-brand-200 space-y-4 animate-fade-in">
                    <div>
                        <label className="label flex items-center gap-1">
                            <TrendingUp size={14} /> Annual investment income
                            <AIHint term="Kapitalvermögen" label="Income from capital investments" />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="e.g. 2000"
                                value={otherIncome.investmentIncome || ''}
                                onChange={e => updateOtherIncome({ investmentIncome: num(e.target.value) })} />
                        </div>
                        <p className="hint-text">From your bank's annual tax certificate (Jahressteuerbescheinigung).</p>
                    </div>
                    <div>
                        <label className="label">Kapitalertragsteuer already withheld by your bank</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="0"
                                value={otherIncome.investmentTaxWithheld || ''}
                                onChange={e => updateOtherIncome({ investmentTaxWithheld: num(e.target.value) })} />
                        </div>
                    </div>
                </div>
            )}

            {/* Rental */}
            <Toggle
                value={otherIncome.hasRental}
                onChange={(v) => updateOtherIncome({ hasRental: v })}
                label="Rental income (Vermietung und Verpachtung)"
                desc="Income from renting out property"
            />
            {otherIncome.hasRental && (
                <div className="pl-4 border-l-2 border-brand-200 space-y-4 animate-fade-in">
                    <div>
                        <label className="label flex items-center gap-1">
                            <Home size={14} /> Annual rent received (Mieteinnahmen)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="e.g. 12000"
                                value={otherIncome.rentalIncome || ''}
                                onChange={e => updateOtherIncome({ rentalIncome: num(e.target.value) })} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Rental expenses (Werbungskosten Vermietung)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <input type="number" min={0} className="input-field pl-8" placeholder="e.g. 4000"
                                value={otherIncome.rentalExpenses || ''}
                                onChange={e => updateOtherIncome({ rentalExpenses: num(e.target.value) })} />
                        </div>
                        <p className="hint-text">Mortgage interest, maintenance, management fees, depreciation (Abschreibung), insurance.</p>
                    </div>
                </div>
            )}

            {!otherIncome.hasSelfEmployed && !otherIncome.hasInvestments && !otherIncome.hasRental && (
                <div className="text-center py-6 text-slate-400">
                    <p className="text-sm">No other income? That's fine — just continue.</p>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onBack} className="btn-ghost flex-1 border border-slate-200">← Back</button>
                <button type="button" onClick={onNext} className="btn-primary flex-1">Continue →</button>
            </div>
        </div>
    )
}
