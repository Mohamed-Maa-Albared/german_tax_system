import { Briefcase, Info } from 'lucide-react';
import { useWizardStore } from '../../../lib/store';
import { formatEuro } from '../../../lib/utils';
import AIHint from '../../AIHint';

interface Props { onNext: () => void; onBack: () => void }

export default function EmploymentIncome({ onNext, onBack }: Props) {
    const { employment, updateEmployment } = useWizardStore()

    function num(val: string) { return parseFloat(val) || 0 }

    return (
        <div className="wizard-step space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-500 mb-1">
                    <Briefcase size={22} className="inline mr-2 mb-0.5 text-accent-500" />
                    Employment Income
                </h2>
                <p className="text-slate-500 text-sm">
                    Find these figures on your Lohnsteuerbescheinigung (wage tax certificate) — your employer sends it automatically each year.
                </p>
            </div>

            {/* Has employment toggle */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                    <span className="font-medium text-slate-800">I was employed (Nichtselbständige Arbeit)</span>
                    <p className="text-xs text-slate-500 mt-0.5">Receiving a salary from an employer with Lohnsteuer withheld</p>
                </div>
                <button
                    type="button"
                    onClick={() => updateEmployment({ hasEmployment: !employment.hasEmployment })}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${employment.hasEmployment ? 'bg-brand-500' : 'bg-slate-300'}`}
                >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${employment.hasEmployment ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            {employment.hasEmployment && (
                <div className="space-y-5 animate-fade-in">
                    {/* Gross salary */}
                    <div>
                        <label className="label flex items-center gap-1">
                            Annual gross salary (Bruttolohn)
                            <AIHint term="Bruttolohn" label="Gross Salary" />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                            <input
                                type="number"
                                min={0}
                                step={100}
                                className="input-field pl-8"
                                placeholder="e.g. 55000"
                                value={employment.grossSalary || ''}
                                onChange={e => updateEmployment({ grossSalary: num(e.target.value) })}
                            />
                        </div>
                        <p className="hint-text">Look for "Bruttoarbeitslohn" (field 3) on your Lohnsteuerbescheinigung.</p>
                    </div>

                    {/* Lohnsteuer withheld */}
                    <div>
                        <label className="label flex items-center gap-1">
                            Income tax withheld by employer (Lohnsteuer)
                            <AIHint term="Lohnsteuer" label="Wage Tax Withheld" />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                            <input
                                type="number"
                                min={0}
                                step={10}
                                className="input-field pl-8"
                                placeholder="e.g. 12000"
                                value={employment.lohnsteuerWithheld || ''}
                                onChange={e => updateEmployment({ lohnsteuerWithheld: num(e.target.value) })}
                            />
                        </div>
                        <p className="hint-text">Look for "einbehaltene Lohnsteuer" (field 4) on your Lohnsteuerbescheinigung.</p>
                    </div>

                    {/* Soli withheld */}
                    <div>
                        <label className="label flex items-center gap-1">
                            Solidarity surcharge withheld (Solidaritätszuschlag)
                            <AIHint term="Solidaritätszuschlag" label="Solidarity Surcharge" />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className="input-field pl-8"
                                placeholder="Often €0 — most people exempt"
                                value={employment.soliWithheld || ''}
                                onChange={e => updateEmployment({ soliWithheld: num(e.target.value) })}
                            />
                        </div>
                        <p className="hint-text">Field 5 on your Lohnsteuerbescheinigung. Most employees pay €0 Soli since 2021.</p>
                    </div>

                    {/* Church tax withheld */}
                    <div>
                        <label className="label flex items-center gap-1">
                            Church tax withheld (Kirchensteuer) — leave at 0 if not applicable
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                            <input
                                type="number"
                                min={0}
                                step={10}
                                className="input-field pl-8"
                                placeholder="0"
                                value={employment.kirchensteuerWithheld || ''}
                                onChange={e => updateEmployment({ kirchensteuerWithheld: num(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Helper snippet */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">Where to find your Lohnsteuerbescheinigung</p>
                            <p>Your employer must send it by end of February each year. It may also appear in your payslip app (Personio, DATEV, etc.) or you can ask HR for a copy.</p>
                        </div>
                    </div>

                    {/* Live preview */}
                    {employment.grossSalary > 0 && (
                        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm">
                            <p className="font-semibold text-brand-700 mb-1">Quick summary</p>
                            <div className="space-y-1 text-slate-600">
                                <div className="flex justify-between">
                                    <span>Gross salary</span>
                                    <span className="font-medium">{formatEuro(employment.grossSalary)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax withheld</span>
                                    <span className="font-medium text-red-600">−{formatEuro(employment.lohnsteuerWithheld + employment.soliWithheld + employment.kirchensteuerWithheld)}</span>
                                </div>
                                <div className="flex justify-between border-t border-brand-200 pt-1">
                                    <span className="font-semibold">Net after income tax</span>
                                    <span className="font-semibold text-brand-600">{formatEuro(employment.grossSalary - employment.lohnsteuerWithheld - employment.soliWithheld - employment.kirchensteuerWithheld)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onBack} className="btn-ghost flex-1 border border-slate-200">
                    ← Back
                </button>
                <button type="button" onClick={onNext} className="btn-primary flex-2 flex-1">
                    Continue →
                </button>
            </div>
        </div>
    )
}
