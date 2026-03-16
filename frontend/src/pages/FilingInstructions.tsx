import { ArrowLeft, Calendar, CheckCircle, ChevronRight, Clock, Download, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaxStore } from '../lib/store'
import { formatCurrency, formatPercent } from '../lib/utils'

const ELSTER_URL = 'https://www.elster.de'

// ─── Filing deadline lookup ──────────────────────────────────────────────────
const DEADLINES: Record<number, { mandatory: string; voluntary: string }> = {
    2022: { mandatory: 'N/A (past)', voluntary: '31 December 2026' },
    2023: { mandatory: 'N/A (past)', voluntary: '31 December 2027' },
    2024: { mandatory: 'N/A (past)', voluntary: '31 December 2028' },
    2025: { mandatory: '31 July 2026', voluntary: '31 December 2029' },
    2026: { mandatory: '31 July 2027', voluntary: '31 December 2030' },
}

// ─── Filing timing guidance component ─────────────────────────────────────────
interface FilingTimingProps {
    isRefund: boolean
    taxYear: number
    deadline: { mandatory: string; voluntary: string }
    hasSelfEmployment: boolean
}

function FilingTimingGuide({ isRefund, taxYear, deadline, hasSelfEmployment }: FilingTimingProps) {
    const currentMonth = new Date().getMonth() + 1
    const isEarlyInYear = currentMonth <= 2

    return (
        <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-2">
                <Clock size={15} className="text-brand-600 dark:text-brand-400" />
                <h2 className="font-heading font-semibold text-gray-800 dark:text-slate-200">When Should You File?</h2>
            </div>

            {/* Primary recommendation */}
            <div className={`relative overflow-hidden rounded-xl p-4 border ${isRefund
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30'
                : 'bg-brand-50/60 dark:bg-brand-600/10 border-brand-200/60 dark:border-brand-600/30'
                }`}>
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl ${isRefund ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-brand-500'}`} />
                <div className="pl-2">
                    <p className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${isRefund ? 'text-emerald-600 dark:text-emerald-500' : 'text-brand-600 dark:text-brand-400'}`}>
                        // {isRefund ? 'Estimated refund' : 'Payment may be due'}
                    </p>
                    {isRefund ? (
                        <>
                            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                File as early as possible — every month is money with the Finanzamt
                            </p>
                            <p className="text-xs text-emerald-800 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                                Electronic filing via ELSTER typically takes 4–12 weeks to process. File from January onwards.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-brand-900 dark:text-brand-200">
                                No rush to file early — use the time to gather all receipts
                            </p>
                            <p className="text-xs text-brand-800 dark:text-brand-300/80 mt-0.5 leading-relaxed">
                                Mandatory deadline: <strong>{deadline.mandatory}</strong>. Every additional deduction you find reduces the payment.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Early filing caveat */}
            {isRefund && isEarlyInYear && (
                <div className="relative overflow-hidden rounded-xl border border-amber-300/60 dark:border-amber-600/30 bg-amber-50 dark:bg-amber-950/20 p-4">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 dark:bg-amber-500 rounded-l-xl" />
                    <div className="pl-2">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-1">// January/February caveat</p>
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">Lohnsteuerbescheinigung may not have arrived yet</p>
                        <ul className="text-xs text-amber-800 dark:text-amber-300/80 space-y-1 leading-relaxed">
                            <li><strong>Employer sends it by end of February</strong> — use your December payslip figures in the meantime (they typically match).</li>
                            <li><strong>Bank statements</strong> (Jahressteuerbescheinigung) are usually available from mid-February.</li>
                            <li><strong>You can still file early</strong> with estimates, then amend (Berichtigung) once final documents arrive.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Self-employment extra */}
            {hasSelfEmployment && (
                <div className="relative overflow-hidden rounded-xl border border-purple-200/60 dark:border-purple-800/30 bg-purple-50/60 dark:bg-purple-950/20 p-4">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-400 dark:bg-purple-500 rounded-l-xl" />
                    <div className="pl-2">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">// Self-employment</p>
                        <p className="text-xs font-semibold text-purple-900 dark:text-purple-200 mb-0.5">EÜR profit/loss statement required (Anlage EÜR)</p>
                        <p className="text-xs text-purple-800 dark:text-purple-300/80 leading-relaxed">
                            With a Steuerberater, your deadline automatically extends to <strong>31 August {taxYear + 1}</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Key dates table */}
            <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="bg-gray-50 dark:bg-white/3 px-4 py-2 border-b border-gray-100 dark:border-white/5">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500">// Key dates — tax year {taxYear}</p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                    {[
                        {
                            label: 'Employer sends Lohnsteuerbescheinigung',
                            date: `By 28 Feb ${taxYear + 1}`,
                            note: 'Required to file — use Dec payslip if not yet received',
                            color: 'text-gray-400 dark:text-slate-600',
                        },
                        {
                            label: 'Earliest recommended filing',
                            date: `From 1 Jan ${taxYear + 1}`,
                            note: isRefund ? 'File early to get your refund sooner' : 'Wait until all documents arrive',
                            color: 'text-emerald-500 dark:text-emerald-500',
                        },
                        {
                            label: 'Mandatory filing deadline',
                            date: deadline.mandatory,
                            note: 'Only if you are required to file (multiple employers, self-employed, etc.)',
                            color: 'text-brand-500 dark:text-brand-400',
                        },
                        {
                            label: 'Voluntary refund claim deadline',
                            date: deadline.voluntary,
                            note: taxYear === 2022 ? '⚠ URGENT — only months remaining!' : 'Last chance to claim a refund for this year',
                            color: taxYear === 2022 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-slate-600',
                        },
                    ].map(({ label, date, note, color }) => (
                        <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                            <Calendar size={13} className={`flex-shrink-0 mt-0.5 ${color}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{label}</p>
                                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{note}</p>
                            </div>
                            <span className={`text-right flex-shrink-0 font-mono text-xs font-semibold ${taxYear === 2022 && label.includes('voluntary') ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
                                {date}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Data section card ────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
                {icon && <span className="text-brand-500 dark:text-brand-400">{icon}</span>}
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500">// {title}</p>
            </div>
            <div className="px-5 py-3 space-y-0.5">{children}</div>
        </div>
    )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`flex justify-between items-center py-1.5 text-sm border-b border-gray-50 dark:border-white/3 last:border-0 ${highlight ? 'font-semibold' : ''}`}>
            <span className="text-gray-500 dark:text-slate-400 text-xs">{label}</span>
            <span className={`font-mono text-xs ${highlight ? 'text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-slate-300'}`}>{value}</span>
        </div>
    )
}

// ─── Step component ───────────────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4 pb-5 last:pb-0 border-b border-gray-50 dark:border-white/3 last:border-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 dark:bg-brand-500 text-white text-sm font-bold font-heading flex items-center justify-center shadow-sm">
                {n}
            </div>
            <div className="flex-1 pt-0.5">
                <p className="font-heading font-semibold text-gray-800 dark:text-slate-200 mb-1 text-sm">{title}</p>
                <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1 leading-relaxed">{children}</div>
            </div>
        </div>
    )
}
export default function FilingInstructions() {
    const navigate = useNavigate()
    const { personal, employment, otherIncome, deductions, specialExpenses, result } = useTaxStore()
    const [pdfLoading, setPdfLoading] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)

    async function handleDownloadPdf() {
        if (!contentRef.current || pdfLoading) return
        setPdfLoading(true)
        try {
            const html2pdf = (await import('html2pdf.js')).default
            await html2pdf()
                .from(contentRef.current)
                .set({
                    margin: [8, 10, 8, 10],
                    filename: `smarttax_${personal.taxYear}_filing_package.pdf`,
                    image: { type: 'jpeg', quality: 0.92 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all', 'css'] },
                })
                .save()
        } catch (err) {
            console.error('PDF generation failed:', err)
            window.print()
        } finally {
            setPdfLoading(false)
        }
    }

    if (!result) {
        navigate('/wizard')
        return null
    }

    const isRefund = result.refund_or_payment >= 0
    const deadline = DEADLINES[personal.taxYear] ?? DEADLINES[2026]
    const bonusLabel = (employment.bonusType === 'percent' && (employment.bonusPercent ?? 0) > 0)
        ? `${formatCurrency(employment.bonus)} (${employment.bonusPercent}% of gross)`
        : formatCurrency(employment.bonus)
    const otherYears = [2022, 2023, 2024, 2025, 2026].filter((y) => y !== personal.taxYear)

    return (
        <div className="max-w-3xl mx-auto space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-1">
                        // Tax Filing Package
                    </p>
                    <h1 className="font-heading font-bold text-2xl text-gray-900 dark:text-slate-100">
                        {personal.taxYear} Filing Guide
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-500 mt-0.5">
                        Your full tax summary and step-by-step ELSTER instructions
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={pdfLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
                    >
                        {pdfLoading
                            ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                            : <><Download size={14} /> PDF</>}
                    </button>
                    <button
                        onClick={() => navigate('/results')}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Results
                    </button>
                </div>
            </div>

            <div ref={contentRef} className="space-y-6">

                {/* ── Refund / payment hero ── */}
                <div className={`relative overflow-hidden rounded-2xl px-6 py-7 text-center border ${isRefund
                    ? 'bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-sn-card dark:to-sn-card border-emerald-200/80 dark:border-emerald-800/30'
                    : 'bg-gradient-to-br from-red-50 via-white to-white dark:from-red-950/30 dark:via-sn-card dark:to-sn-card border-red-200/80 dark:border-red-800/30'
                    }`}>
                    <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl opacity-20 pointer-events-none ${isRefund ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <p className={`relative font-mono text-[10px] uppercase tracking-widest font-semibold mb-2 ${isRefund ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                        {isRefund ? '// Estimated Tax Refund' : '// Additional Tax Due'}
                    </p>
                    <p className={`relative font-heading text-4xl font-extrabold ${isRefund ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                        {isRefund ? '+' : '–'}{formatCurrency(Math.abs(result.refund_or_payment))}
                    </p>
                    <div className={`relative flex justify-center gap-6 mt-4 pt-4 border-t ${isRefund ? 'border-emerald-100 dark:border-emerald-800/20' : 'border-red-100 dark:border-red-800/20'}`}>
                        {([
                            { label: 'ZVE', value: formatCurrency(result.zve) },
                            { label: 'Income Tax', value: formatCurrency(result.tarifliche_est) },
                            { label: 'Effective Rate', value: formatPercent(result.effective_rate) },
                        ]).map(({ label, value }, i, arr) => (
                            <>
                                <div key={label} className="text-center">
                                    <p className="font-mono text-[9px] uppercase tracking-widest text-gray-400 dark:text-slate-600 mb-0.5">{label}</p>
                                    <p className={`font-heading text-sm font-bold ${isRefund ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{value}</p>
                                </div>
                                {i < arr.length - 1 && <div key={`d${i}`} className={`w-px self-stretch ${isRefund ? 'bg-emerald-100 dark:bg-emerald-800/20' : 'bg-red-100 dark:bg-red-800/20'}`} />}
                            </>
                        ))}
                    </div>
                    <p className="relative text-[10px] text-gray-400 dark:text-slate-600 mt-3">
                        Estimate only — actual amount determined by your Finanzamt
                    </p>
                </div>

                {/* ── Filing timing ── */}
                <FilingTimingGuide
                    isRefund={isRefund}
                    taxYear={personal.taxYear}
                    deadline={deadline}
                    hasSelfEmployment={otherIncome.selfEmployedRevenue > 0}
                />

                {/* ── Input summary sections ── */}
                <Section title="Personal Details">
                    <Row label="Tax Year" value={String(personal.taxYear)} />
                    <Row label="Filing Status" value={personal.isMarried ? 'Joint (Zusammenveranlagung)' : 'Single'} />
                    <Row label="Children" value={personal.numChildren === 0 ? 'None' : String(personal.numChildren)} />
                    <Row label="Church Member" value={personal.isChurchMember ? `Yes (${personal.churchTaxRateType === 'low' ? '8%' : '9%'})` : 'No'} />
                    {personal.federalState && <Row label="Federal State" value={personal.federalState} />}
                    {personal.isDisabled && <Row label="Disability Grade" value={`GdB ${personal.disabilityGrade}`} />}
                </Section>

                <Section title="Employment Income">
                    <Row label="Gross Salary" value={formatCurrency(employment.grossSalary)} />
                    {employment.bonus > 0 && <Row label="Annual Bonus" value={bonusLabel} />}
                    <Row label="Lohnsteuer Withheld" value={formatCurrency(employment.taxesWithheld)} />
                    {(employment.soliWithheld ?? 0) > 0 && <Row label="Soli Withheld" value={formatCurrency(employment.soliWithheld!)} />}
                </Section>

                {(otherIncome.selfEmployedRevenue > 0 || otherIncome.dividends > 0 ||
                    otherIncome.capitalGains > 0 || otherIncome.rentalIncome > 0) && (
                        <Section title="Other Income">
                            {otherIncome.selfEmployedRevenue > 0 && <Row label="Self-employment revenue" value={formatCurrency(otherIncome.selfEmployedRevenue)} />}
                            {otherIncome.selfEmployedExpenses > 0 && <Row label="Business expenses" value={`– ${formatCurrency(otherIncome.selfEmployedExpenses)}`} />}
                            {(otherIncome.dividends > 0 || otherIncome.capitalGains > 0) && <Row label="Capital income" value={formatCurrency(otherIncome.dividends + otherIncome.capitalGains)} />}
                            {otherIncome.rentalIncome > 0 && <Row label="Rental income" value={formatCurrency(otherIncome.rentalIncome)} />}
                        </Section>
                    )}

                {(deductions.commuteKm > 0 || deductions.homeOfficeDays > 0 ||
                    (deductions.workEquipment ?? 0) > 0 || (deductions.workTraining ?? 0) > 0 ||
                    (deductions.unionFees ?? 0) > 0) && (
                        <Section title="Work Deductions (Werbungskosten)">
                            {deductions.commuteKm > 0 && <Row label="Commute" value={`${deductions.commuteKm} km × ${deductions.commuteDays} days × €0.38`} />}
                            {deductions.homeOfficeDays > 0 && <Row label="Home office" value={`${deductions.homeOfficeDays} days × €6`} />}
                            {(deductions.workEquipment ?? 0) > 0 && <Row label="Work equipment" value={formatCurrency(deductions.workEquipment!)} />}
                            {(deductions.workTraining ?? 0) > 0 && <Row label="Work training" value={formatCurrency(deductions.workTraining!)} />}
                            {(deductions.unionFees ?? 0) > 0 && <Row label="Union fees" value={formatCurrency(deductions.unionFees!)} />}
                            <Row label="Total Werbungskosten used" value={formatCurrency(result.werbungskosten_used)} highlight />
                        </Section>
                    )}

                {(specialExpenses.pensionContributions > 0 || specialExpenses.healthInsuranceContributions > 0 ||
                    specialExpenses.donations > 0 || specialExpenses.childcareCosts > 0) && (
                        <Section title="Special Expenses (Sonderausgaben)">
                            {specialExpenses.pensionContributions > 0 && <Row label="Pension contributions" value={formatCurrency(specialExpenses.pensionContributions)} />}
                            {specialExpenses.healthInsuranceContributions > 0 && <Row label="Health insurance" value={formatCurrency(specialExpenses.healthInsuranceContributions)} />}
                            {(specialExpenses.longTermCareInsurance ?? 0) > 0 && <Row label="Long-term care insurance" value={formatCurrency(specialExpenses.longTermCareInsurance!)} />}
                            {specialExpenses.donations > 0 && <Row label="Donations" value={formatCurrency(specialExpenses.donations)} />}
                            {specialExpenses.childcareCosts > 0 && <Row label="Childcare costs" value={formatCurrency(specialExpenses.childcareCosts)} />}
                            {specialExpenses.alimonyPaid > 0 && <Row label="Alimony (Realsplitting)" value={formatCurrency(specialExpenses.alimonyPaid)} />}
                            <Row label="Total Sonderausgaben used" value={formatCurrency(result.sonderausgaben_used)} highlight />
                        </Section>
                    )}

                <Section title="Tax Calculation Result">
                    <Row label="Taxable income (ZVE)" value={formatCurrency(result.zve)} highlight />
                    <Row label="Income tax (Einkommensteuer)" value={formatCurrency(result.tarifliche_est)} />
                    {result.solidaritaetszuschlag > 0 && <Row label="Solidarity surcharge (Soli)" value={formatCurrency(result.solidaritaetszuschlag)} />}
                    {result.kirchensteuer > 0 && <Row label="Church tax (Kirchensteuer)" value={formatCurrency(result.kirchensteuer)} />}
                    {result.capital_tax_flat > 0 && <Row label="Investment flat tax (Abgeltungsteuer)" value={formatCurrency(result.capital_tax_flat)} />}
                    <Row label="Total tax liability" value={formatCurrency(result.total_tax)} highlight />
                    <Row label="Total already withheld" value={formatCurrency(result.total_withheld)} />
                    <Row label={isRefund ? '→ Estimated refund' : '→ Additional payment due'} value={`${isRefund ? '+' : '–'}${formatCurrency(Math.abs(result.refund_or_payment))}`} highlight />
                    <div className="pt-2 flex justify-between text-[11px] text-gray-400 dark:text-slate-600">
                        <span>Effective rate: {formatPercent(result.effective_rate)}</span>
                        <span>Marginal rate: {formatPercent(result.marginal_rate)}</span>
                    </div>
                </Section>

                {/* ── How to File steps ── */}
                <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none space-y-5">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">// Filing Guide</p>
                        <h2 className="font-heading font-semibold text-gray-800 dark:text-slate-200">How to File Your Tax Return</h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Follow these steps to submit your return through ELSTER, the official German tax portal — free and faster than paper.
                        </p>
                    </div>
                    <div className="space-y-0">
                        <Step n={1} title="Create your free ELSTER account">
                            <p>
                                Go to{' '}
                                <a href={ELSTER_URL} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5">
                                    elster.de <ExternalLink size={10} />
                                </a>{' '}
                                → <strong>Mein ELSTER / Registrieren</strong> → "Privatpersonen". You'll receive an activation letter by post (allow 2 weeks). Keep your certificate file safe — you need it every year.
                            </p>
                            <p className="text-gray-400 dark:text-slate-600">Already have an account? Skip to step 3.</p>
                        </Step>
                        <Step n={2} title="Gather your documents">
                            <ul className="space-y-0.5">
                                {[
                                    'Lohnsteuerbescheinigung (from your employer, sent by end of February)',
                                    'Bank statements for interest / investment income (Jahressteuerbescheinigung)',
                                    'Receipts for claimed deductions: commute, home office, work equipment',
                                    'Insurance premium statements: health, pension, long-term care',
                                    'Childcare invoices and donation receipts (if applicable)',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-1.5">
                                        <CheckCircle size={11} className="text-brand-500 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </Step>
                        <Step n={3} title="Log in and start your return">
                            <p>
                                Log in → <strong>Formulare & Leistungen → Einkommensteuererklärung {personal.taxYear}</strong>.
                                Employment-only? Use <strong>simplyELSTERplus</strong>. Multiple income types: use Mantelbogen ESt 1 A + Anlage N.
                            </p>
                        </Step>
                        <Step n={4} title="Enter your figures — use this summary as your reference">
                            <p>
                                Transfer the numbers from this document into ELSTER.
                                Key forms:{' '}
                                <strong>Anlage N</strong> (employment/Werbungskosten){otherIncome.selfEmployedRevenue > 0 && <>, <strong>Anlage S</strong> (self-employment)</>}
                                {(otherIncome.dividends > 0 || otherIncome.capitalGains > 0) && <>, <strong>Anlage KAP</strong> (capital income)</>}
                                {otherIncome.rentalIncome > 0 && <>, <strong>Anlage V</strong> (rental income)</>}
                                , <strong>Anlage Vorsorgeaufwand</strong> (insurance).
                            </p>
                        </Step>
                        <Step n={5} title="Submit and wait for your Steuerbescheid">
                            <p>
                                ELSTER runs plausibility checks, then submits electronically. You'll receive a confirmation number.
                                The Finanzamt sends a <strong>Steuerbescheid</strong> — refund or payment demand.
                            </p>
                        </Step>
                        <Step n={6} title="Review your Steuerbescheid and appeal if needed">
                            <p>
                                Compare the official notice to this estimate. If you disagree, you have <strong>1 month</strong> to file
                                an objection (Einspruch) via ELSTER or by post.
                            </p>
                        </Step>
                    </div>
                </div>

                {/* ── Timeline ── */}
                <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-4">// Expected Timeline</p>
                    <div className="space-y-0 divide-y divide-gray-50 dark:divide-white/5">
                        {[
                            { phase: 'Now', detail: 'Gather documents, create ELSTER account if needed' },
                            { phase: 'Filing deadline', detail: `${deadline.mandatory} (mandatory) · ${deadline.voluntary} (voluntary)` },
                            { phase: '4–12 weeks after filing', detail: 'Tax office processes your return (e-filing is faster)' },
                            {
                                phase: 'After assessment', detail: isRefund
                                    ? `Refund of ~${formatCurrency(Math.abs(result.refund_or_payment))} paid to your bank account`
                                    : `Additional payment of ~${formatCurrency(Math.abs(result.refund_or_payment))} due within 1 month`
                            },
                            { phase: '+1 month after notice', detail: 'Deadline to appeal (Einspruch) if you disagree with the Steuerbescheid' },
                        ].map(({ phase, detail }, i) => (
                            <div key={i} className="flex gap-4 py-2.5 items-baseline">
                                <span className="font-mono text-[11px] font-semibold text-brand-600 dark:text-brand-400 w-36 flex-shrink-0">{phase}</span>
                                <span className="text-xs text-gray-600 dark:text-slate-400">{detail}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── File for other years ── */}
                <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-600/20 flex items-center justify-center">
                            <Calendar size={15} className="text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">// Multi-year filing</p>
                            <h2 className="font-heading font-semibold text-gray-800 dark:text-slate-200">File for other years too</h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                You can voluntarily claim refunds for up to 4 years back. Run the calculator for each year separately.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {otherYears.map((year) => {
                            const d = DEADLINES[year]
                            const isUrgent = year === 2022
                            return (
                                <button
                                    key={year}
                                    onClick={() => navigate('/wizard')}
                                    className={`relative overflow-hidden rounded-xl p-3 text-left border transition-colors group ${isUrgent
                                        ? 'border-red-200/60 dark:border-red-800/30 bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-950/30'
                                        : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/3 hover:bg-gray-100/60 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-400 dark:bg-red-500 rounded-l-xl" />}
                                    <p className={`font-heading text-2xl font-extrabold leading-none ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-slate-200'}`}>
                                        {year}
                                    </p>
                                    <p className={`text-[10px] mt-1.5 leading-tight ${isUrgent ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                                        Until {d?.voluntary}
                                    </p>
                                    <div className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${isUrgent ? 'text-red-500 dark:text-red-400' : 'text-brand-500 dark:text-brand-400'}`}>
                                        <ChevronRight size={11} />
                                        Calculate
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* ── Optimisation tips ── */}
                {result.suggestions && result.suggestions.length > 0 && (
                    <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">// Optimisation tips for next year</p>
                        <div className="space-y-2">
                            {result.suggestions.map((s, i) => (
                                <div key={i} className="relative overflow-hidden flex items-start gap-2 text-xs bg-brand-50 dark:bg-brand-600/10 border border-brand-200/60 dark:border-brand-600/30 rounded-lg pl-4 pr-3 py-2">
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-500 rounded-l-lg" />
                                    <CheckCircle size={11} className="text-brand-500 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700 dark:text-slate-300">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Disclaimer ── */}
                <p className="text-[10px] text-gray-400 dark:text-slate-600 text-center leading-relaxed pb-2 print:text-gray-500">
                    This document is an estimate generated by SmartTax Germany for guidance purposes only.
                    It does not constitute legal or tax advice. Figures may differ from the official Finanzamt assessment
                    due to rounding, additional circumstances, or changes in tax law.
                    Always verify with a qualified tax adviser (Steuerberater) or Lohnsteuerhilfeverein.
                </p>

            </div>{/* end contentRef */}

            {/* ── Actions bar ── */}
            <div className="flex flex-wrap items-center gap-2 justify-center print:hidden">
                <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                >
                    {pdfLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                        : <><Download size={14} /> Download PDF</>}
                </button>
                <button
                    onClick={() => navigate('/results')}
                    className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft size={14} />
                    Back to Results
                </button>
                <button
                    onClick={() => navigate('/wizard')}
                    className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-500 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                    <FileText size={14} />
                    Edit Inputs
                </button>
            </div>
        </div>
    )
}
