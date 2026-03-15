import { AlertTriangle, CheckCircle, Clock, Download, ExternalLink, Loader2, TrendingUp } from 'lucide-react'
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
    const currentMonth = new Date().getMonth() + 1 // 1-indexed
    const isEarlyInYear = currentMonth <= 2 // Jan or Feb — Lohnsteuerbescheinigung may not have arrived yet

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 print:border-gray-300">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-brand-600" />
                When Should You File?
            </h2>

            {/* Primary recommendation banner */}
            <div className={`rounded-lg p-4 flex gap-3 items-start ${isRefund
                ? 'bg-green-50 border border-green-200'
                : 'bg-blue-50 border border-blue-200'
                }`}>
                {isRefund ? (
                    <TrendingUp size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                    <Clock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                    {isRefund ? (
                        <>
                            <p className="font-semibold text-green-800">
                                You have an estimated refund — file as early as possible!
                            </p>
                            <p className="text-green-700 mt-0.5">
                                Every month you wait is money sitting with the Finanzamt. File from January onwards
                                to receive your refund in 4–12 weeks (electronic filing is faster).
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-blue-800">
                                You may owe an additional payment — no rush to file early.
                            </p>
                            <p className="text-blue-700 mt-0.5">
                                Since no refund is expected, you can wait until closer to the mandatory
                                deadline ({deadline.mandatory}). Use the extra time to gather all receipts
                                and ensure every deduction is claimed.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Early filing caveat (Jan/Feb) */}
            {isRefund && isEarlyInYear && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">
                            Filing in January/February: what to know
                        </p>
                        <ul className="space-y-1.5">
                            <li className="flex gap-2">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>
                                    <strong>Lohnsteuerbescheinigung</strong> (employer wage certificate) is
                                    required for your return. Employers must send it by end of February.
                                    If it hasn't arrived, use your December payslip figures — both typically match.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>
                                    <strong>Bank statements</strong> for interest, dividends, and capital gains
                                    (Jahressteuerbescheinigung) are usually available from mid-February.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>
                                    <strong>Can you still file?</strong> Yes — submit using your best estimates,
                                    then amend (Berichtigung) once you have the final documents. ELSTER allows
                                    amendments before the Steuerbescheid becomes final.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>
                                    <strong>Insurance statements</strong> (health, pension, Riester) are typically
                                    sent in January/February. Contact your insurer if you haven't received them.
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Self-employment special guidance */}
            {hasSelfEmployment && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3 items-start">
                    <AlertTriangle size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                        <p className="font-semibold mb-1">Self-employment: additional preparation needed</p>
                        <p>
                            You have self-employment income — you must prepare an <strong>EÜR
                                (Einnahmen-Überschuss-Rechnung)</strong> profit/loss statement as Anlage EÜR.
                            This takes more time. If you use a Steuerberater, your deadline automatically
                            extends to <strong>31 August {taxYear + 1}</strong>&nbsp;(extended deadline for advisees).
                        </p>
                    </div>
                </div>
            )}

            {/* Summary table */}
            <div className="border border-gray-100 rounded-lg overflow-hidden text-sm">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Key Dates for Tax Year {taxYear}
                </div>
                <div className="divide-y divide-gray-50">
                    {[
                        {
                            label: 'Employer sends Lohnsteuerbescheinigung',
                            date: `By 28 February ${taxYear + 1}`,
                            note: 'Required to file — use Dec payslip if not yet received',
                            icon: <Clock size={13} className="text-gray-400" />,
                        },
                        {
                            label: 'Earliest recommended filing date',
                            date: `From 1 January ${taxYear + 1}`,
                            note: isRefund ? 'File early to get your refund sooner' : 'Wait until all documents arrive',
                            icon: <TrendingUp size={13} className="text-green-500" />,
                        },
                        {
                            label: 'Mandatory filing deadline',
                            date: deadline.mandatory,
                            note: 'Only applies if you are required to file (multiple employers, self-employed, etc.)',
                            icon: <Clock size={13} className="text-blue-500" />,
                        },
                        {
                            label: 'Voluntary refund claim deadline',
                            date: deadline.voluntary,
                            note: taxYear === 2022 ? '⚠ URGENT — only months remaining!' : 'Last chance to claim a refund for this year',
                            icon: taxYear === 2022
                                ? <AlertTriangle size={13} className="text-red-500" />
                                : <CheckCircle size={13} className="text-gray-400" />,
                        },
                    ].map(({ label, date, note, icon }) => (
                        <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                            <span className="mt-0.5 flex-shrink-0">{icon}</span>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-700">{label}</span>
                                <span className="text-gray-400 text-xs block">{note}</span>
                            </div>
                            <span className={`text-right flex-shrink-0 font-semibold text-xs ${taxYear === 2022 && label.includes('voluntary') ? 'text-red-600' : 'text-gray-700'
                                }`}>{date}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Print-safe section wrapper ───────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden print:border-gray-300 print:rounded-none">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 print:bg-gray-100">
                <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h2>
            </div>
            <div className="px-4 py-3 space-y-1">{children}</div>
        </div>
    )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`flex justify-between py-1 text-sm ${highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            <span className="text-gray-500">{label}</span>
            <span className={highlight ? 'text-brand-700' : ''}>{value}</span>
        </div>
    )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">
                {n}
            </div>
            <div className="flex-1 pb-5 border-b border-gray-100 last:border-0">
                <p className="font-semibold text-gray-800 mb-1">{title}</p>
                <div className="text-sm text-gray-600 space-y-1 leading-relaxed">{children}</div>
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
            window.print() // fallback
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

    // Multi-year filing opportunities
    const otherYears = [2022, 2023, 2024, 2025, 2026].filter((y) => y !== personal.taxYear)

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Tax Filing Package — {personal.taxYear}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Your tax estimate summary and step-by-step filing instructions
                    </p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={pdfLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
                    >
                        {pdfLoading
                            ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                            : <><Download size={14} /> Download PDF</>
                        }
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        title="Print / Save as PDF via browser dialog"
                    >
                        Print
                    </button>
                </div>
            </div>

            {/* ── Printable content ─────────────────────────────────────── */}
            <div ref={contentRef}>

                {/* ── Refund / payment banner ────────────────────────────────── */}
                <div
                    className={`rounded-xl p-5 text-center border-2 ${isRefund
                        ? 'bg-green-50 border-green-400 text-green-800'
                        : 'bg-red-50 border-red-400 text-red-800'
                        }`}
                >
                    <p className="text-sm font-medium">
                        {isRefund ? '🎉 Estimated Tax Refund' : '⚠ Estimated Additional Payment Due'}
                    </p>
                    <p className="text-4xl font-extrabold mt-1">
                        {isRefund ? '+' : '-'}
                        {formatCurrency(Math.abs(result.refund_or_payment))}
                    </p>
                    <p className="text-xs mt-2 opacity-70">
                        Estimate only — actual amount determined by your local tax office (Finanzamt)
                    </p>
                </div>

                {/* ── When to File: Timing Guidance ─────────────────────────────── */}
                <FilingTimingGuide
                    isRefund={isRefund}
                    taxYear={personal.taxYear}
                    deadline={deadline}
                    hasSelfEmployment={otherIncome.selfEmployedRevenue > 0}
                />

                {/* ── Document: Input Summary ────────────────────────────────── */}
                <Section title="Personal Details">
                    <Row label="Tax Year" value={String(personal.taxYear)} />
                    <Row label="Filing Status" value={personal.isMarried ? 'Joint (Zusammenveranlagung)' : 'Single'} />
                    <Row label="Children" value={personal.numChildren === 0 ? 'None' : String(personal.numChildren)} />
                    <Row label="Church Member" value={personal.isChurchMember ? `Yes (${personal.churchTaxRateType === 'low' ? '8%' : '9%'})` : 'No'} />
                    <Row label="Federal State" value={personal.federalState ?? '–'} />
                    {personal.isDisabled && (
                        <Row label="Disability Grade" value={`GdB ${personal.disabilityGrade}`} />
                    )}
                </Section>

                <Section title="Employment Income">
                    <Row label="Gross Salary" value={formatCurrency(employment.grossSalary)} />
                    {employment.bonus > 0 && <Row label="Annual Bonus" value={bonusLabel} />}
                    <Row label="Income Tax Withheld (Lohnsteuer)" value={formatCurrency(employment.taxesWithheld)} />
                </Section>

                {(otherIncome.selfEmployedRevenue > 0 || otherIncome.dividends > 0 ||
                    otherIncome.capitalGains > 0 || otherIncome.rentalIncome > 0) && (
                        <Section title="Other Income">
                            {otherIncome.selfEmployedRevenue > 0 && (
                                <Row label="Self-employment revenue" value={formatCurrency(otherIncome.selfEmployedRevenue)} />
                            )}
                            {otherIncome.selfEmployedExpenses > 0 && (
                                <Row label="Business expenses" value={`– ${formatCurrency(otherIncome.selfEmployedExpenses)}`} />
                            )}
                            {(otherIncome.dividends > 0 || otherIncome.capitalGains > 0) && (
                                <Row
                                    label="Capital income (dividends + gains)"
                                    value={formatCurrency(otherIncome.dividends + otherIncome.capitalGains)}
                                />
                            )}
                            {otherIncome.rentalIncome > 0 && (
                                <Row label="Rental income" value={formatCurrency(otherIncome.rentalIncome)} />
                            )}
                        </Section>
                    )}

                {(deductions.commuteKm > 0 || deductions.homeOfficeDays > 0 ||
                    (deductions.workEquipment ?? 0) > 0 || (deductions.workTraining ?? 0) > 0) && (
                        <Section title="Work Deductions (Werbungskosten)">
                            {deductions.commuteKm > 0 && (
                                <Row
                                    label="Commute deduction"
                                    value={`${deductions.commuteKm} km × ${deductions.commuteDays} days × €0.38`}
                                />
                            )}
                            {deductions.homeOfficeDays > 0 && (
                                <Row label="Home office" value={`${deductions.homeOfficeDays} days × €6`} />
                            )}
                            {(deductions.workEquipment ?? 0) > 0 && (
                                <Row label="Work equipment" value={formatCurrency(deductions.workEquipment!)} />
                            )}
                            {(deductions.workTraining ?? 0) > 0 && (
                                <Row label="Work training & education" value={formatCurrency(deductions.workTraining!)} />
                            )}
                            {(deductions.unionFees ?? 0) > 0 && (
                                <Row label="Union fees" value={formatCurrency(deductions.unionFees!)} />
                            )}
                            <Row label="Total Werbungskosten used" value={formatCurrency(result.werbungskosten_used)} highlight />
                        </Section>
                    )}

                {(specialExpenses.pensionContributions > 0 || specialExpenses.healthInsuranceContributions > 0 ||
                    specialExpenses.donations > 0 || specialExpenses.childcareCosts > 0) && (
                        <Section title="Special Expenses (Sonderausgaben)">
                            {specialExpenses.pensionContributions > 0 && (
                                <Row label="Pension contributions" value={formatCurrency(specialExpenses.pensionContributions)} />
                            )}
                            {specialExpenses.healthInsuranceContributions > 0 && (
                                <Row label="Health insurance" value={formatCurrency(specialExpenses.healthInsuranceContributions)} />
                            )}
                            {(specialExpenses.longTermCareInsurance ?? 0) > 0 && (
                                <Row label="Long-term care insurance" value={formatCurrency(specialExpenses.longTermCareInsurance!)} />
                            )}
                            {specialExpenses.donations > 0 && (
                                <Row label="Donations" value={formatCurrency(specialExpenses.donations)} />
                            )}
                            {specialExpenses.childcareCosts > 0 && (
                                <Row label="Childcare costs" value={formatCurrency(specialExpenses.childcareCosts)} />
                            )}
                            {specialExpenses.alimonyPaid > 0 && (
                                <Row label="Alimony paid (Realsplitting)" value={formatCurrency(specialExpenses.alimonyPaid)} />
                            )}
                            <Row label="Total Sonderausgaben used" value={formatCurrency(result.sonderausgaben_used)} highlight />
                        </Section>
                    )}

                <Section title="Tax Calculation Result">
                    <Row label="Taxable income (ZVE)" value={formatCurrency(result.zve)} highlight />
                    <Row label="Income tax (Einkommensteuer)" value={formatCurrency(result.tarifliche_est)} />
                    {result.solidaritaetszuschlag > 0 && (
                        <Row label="Solidarity surcharge (Soli)" value={formatCurrency(result.solidaritaetszuschlag)} />
                    )}
                    {result.kirchensteuer > 0 && (
                        <Row label="Church tax (Kirchensteuer)" value={formatCurrency(result.kirchensteuer)} />
                    )}
                    {result.capital_tax_flat > 0 && (
                        <Row label="Investment flat tax (Abgeltungsteuer)" value={formatCurrency(result.capital_tax_flat)} />
                    )}
                    <Row label="Total tax liability" value={formatCurrency(result.total_tax)} highlight />
                    <Row label="Total already withheld" value={formatCurrency(result.total_withheld)} />
                    <Row
                        label={isRefund ? '→ Estimated refund' : '→ Estimated additional payment'}
                        value={`${isRefund ? '+' : '–'}${formatCurrency(Math.abs(result.refund_or_payment))}`}
                        highlight
                    />
                    <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between text-xs text-gray-400">
                        <span>Effective rate: {formatPercent(result.effective_rate)}</span>
                        <span>Marginal rate: {formatPercent(result.marginal_rate)}</span>
                    </div>
                </Section>

                {/* ── Filing Instructions ───────────────────────────────────── */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 print:border-gray-300">
                    <h2 className="text-lg font-bold text-gray-900">
                        How to File Your Tax Return
                    </h2>
                    <p className="text-sm text-gray-500">
                        Follow these steps to submit your return through ELSTER, the official German
                        tax portal. It's free, and most returns are processed faster than with paper.
                    </p>

                    <div className="space-y-0">
                        <Step n={1} title="Create your free ELSTER account">
                            <p>
                                Go to{' '}
                                <a href={ELSTER_URL} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-0.5">
                                    elster.de <ExternalLink size={11} />
                                </a>{' '}
                                and click <strong>Mein ELSTER / Registrieren</strong>. Choose
                                &quot;Privatpersonen&quot; for individuals. You'll receive an activation
                                letter by post within 2 weeks (allow extra time). Keep your certificate
                                file safe — you'll need it every year.
                            </p>
                            <p className="text-gray-400 text-xs">
                                Already have an account? Skip to step 3.
                            </p>
                        </Step>

                        <Step n={2} title="Gather your documents">
                            <p>You will need:</p>
                            <ul className="ml-4 space-y-0.5 list-none">
                                {[
                                    'Lohnsteuerbescheinigung (from your employer — sent by end of February)',
                                    'Bank statements for interest / investment income',
                                    'Receipts for deductions you are claiming (commute, home office, equipment)',
                                    'Insurance premium statements (health, pension, long-term care)',
                                    'Childcare invoices (if applicable)',
                                    'Donation receipts (if applicable)',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-1.5">
                                        <CheckCircle size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </Step>

                        <Step n={3} title="Log in and start your return">
                            <p>
                                Log in to Mein ELSTER. Click <strong>Formulare & Leistungen →
                                    Einkommensteuererklärung {personal.taxYear}</strong>. If you only have
                                employment income, you can use the simplified <strong>simplyELSTERplus</strong>{' '}
                                form, which guides you with plain questions. For multiple income types,
                                use the full form (Mantelbogen ESt 1 A + Anlage N).
                            </p>
                        </Step>

                        <Step n={4} title="Enter your figures — use this summary as your reference">
                            <p>
                                Transfer the numbers from this document into the ELSTER form. The
                                field names in ELSTER are in German — refer to the German terms shown
                                in the tooltips (ℹ icon) next to each field in this app.
                            </p>
                            <p>
                                Key forms you'll need:{' '}
                                <strong>Anlage N</strong> (employment income &amp; Werbungskosten),{' '}
                                {(otherIncome.selfEmployedRevenue > 0) && <><strong>Anlage S</strong> (self-employment), </>}
                                {(otherIncome.dividends > 0 || otherIncome.capitalGains > 0) && <><strong>Anlage KAP</strong> (capital income), </>}
                                {(otherIncome.rentalIncome > 0) && <><strong>Anlage V</strong> (rental income), </>}
                                <strong>Anlage Vorsorgeaufwand</strong> (insurance &amp; pension contributions).
                            </p>
                        </Step>

                        <Step n={5} title="Submit and wait for your Steuerbescheid">
                            <p>
                                Once complete, ELSTER runs automated plausibility checks and submits
                                electronically to your local tax office (Finanzamt). You'll receive a
                                confirmation number. The tax office then sends a formal assessment
                                notice (<strong>Steuerbescheid</strong>) — refund to your bank account
                                or demand for additional payment.
                            </p>
                        </Step>

                        <Step n={6} title="Review your Steuerbescheid and appeal if needed">
                            <p>
                                Compare the official notice to this estimate. If you disagree, you have{' '}
                                <strong>1 month</strong> to file an objection (Einspruch) — do this
                                in writing via ELSTER or post.
                            </p>
                        </Step>
                    </div>
                </div>

                {/* ── Timeline ─────────────────────────────────────────────────── */}
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
                    <h2 className="text-base font-bold text-brand-900 mb-4">Expected Timeline</h2>
                    <div className="space-y-2">
                        {[
                            { phase: 'Now', detail: 'Gather documents, create ELSTER account if needed' },
                            { phase: 'Filing deadline', detail: `${deadline.mandatory} (if mandatory) · ${deadline.voluntary} (voluntary refund claim)` },
                            { phase: '4–12 weeks after filing', detail: 'Tax office processes your return (e-filing is typically faster)' },
                            { phase: 'After processing', detail: `${isRefund ? `Refund of ~${formatCurrency(Math.abs(result.refund_or_payment))} paid to your bank account` : `Additional payment of ~${formatCurrency(Math.abs(result.refund_or_payment))} due within 1 month of notice`}` },
                            { phase: '1 month after notice', detail: 'Deadline to appeal (Einspruch) if you disagree with the Steuerbescheid' },
                        ].map(({ phase, detail }) => (
                            <div key={phase} className="flex gap-3 text-sm">
                                <span className="font-semibold text-brand-700 w-40 flex-shrink-0">{phase}</span>
                                <span className="text-gray-600">{detail}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Multi-year opportunities ─────────────────────────────────── */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h2 className="text-base font-bold text-amber-900 mb-2">
                        📅 File for other years too
                    </h2>
                    <p className="text-sm text-amber-800 mb-4">
                        You can voluntarily file for up to 4 years back. Run the calculator for each
                        year separately and file a separate return via ELSTER.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {otherYears.map((year) => {
                            const d = DEADLINES[year]
                            const isUrgent = year === 2022
                            return (
                                <div
                                    key={year}
                                    className={`rounded-lg p-3 text-center border ${isUrgent ? 'bg-red-50 border-red-300' : 'bg-white border-amber-100'}`}
                                >
                                    <p className={`text-xl font-extrabold ${isUrgent ? 'text-red-600' : 'text-amber-900'}`}>{year}</p>
                                    <p className={`text-xs mt-0.5 leading-tight ${isUrgent ? 'text-red-500 font-semibold' : 'text-amber-600'}`}>
                                        Until {d?.voluntary}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── Suggestions from the calculator ──────────────────────────── */}
                {result.suggestions && result.suggestions.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h2 className="text-base font-bold text-gray-800 mb-3">
                            💡 Optimisation Tips For Next Year
                        </h2>
                        <ul className="space-y-2">
                            {result.suggestions.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                    <CheckCircle size={15} className="text-brand-500 flex-shrink-0 mt-0.5" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Disclaimer ───────────────────────────────────────────────── */}
                <p className="text-xs text-gray-400 text-center leading-relaxed print:text-gray-500">
                    This document is an estimate generated by SmartTax Germany for guidance purposes
                    only. It does not constitute legal or tax advice. Figures may differ from the
                    official assessment by your Finanzamt due to rounding, additional circumstances,
                    or changes in tax law. Always verify important decisions with a qualified tax
                    adviser (Steuerberater) or Lohnsteuerhilfeverein.
                </p>
            </div>{/* ── end contentRef ── */}

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <div className="flex gap-3 justify-center print:hidden">
                <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
                >
                    {pdfLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                        : <><Download size={15} /> Download PDF</>
                    }
                </button>
                <button
                    onClick={() => navigate('/results')}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                    ← Back to Results
                </button>
                <button
                    onClick={() => navigate('/wizard')}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                    Edit Inputs
                </button>
            </div>
        </div>
    )
}
