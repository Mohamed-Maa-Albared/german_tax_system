import { useEffect, useState } from 'react'
import {
    Bar,
    BarChart,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { formatCurrency, formatPercent } from '../lib/utils'
import { TaxBreakdown } from '../types/tax'

interface TaxBreakdownProps {
    breakdown: TaxBreakdown
}

function Divider({ label }: { label: string }) {
    return (
        <div className="relative flex items-center gap-3 mt-5 mb-3 pl-4">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-500 dark:bg-brand-400 rounded-full" />
            <span className="font-mono text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                // {label}
            </span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
        </div>
    )
}

function Row({
    label,
    value,
    indent,
    bold,
    highlight,
    subtext,
}: {
    label: string
    value: number
    indent?: boolean
    bold?: boolean
    highlight?: boolean
    subtext?: string
}) {
    if (value === 0 && !bold && !highlight) return null
    return (
        <div
            className={`flex justify-between items-start rounded-lg py-2 px-3 transition-colors ${highlight
                ? value >= 0
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40'
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40'
                : 'hover:bg-gray-50 dark:hover:bg-white/3'
                } ${indent ? 'ml-3' : ''}`}
        >
            <div className="flex-1">
                <span className={`text-sm leading-snug ${bold ? 'font-semibold text-gray-800 dark:text-slate-200' : 'text-gray-600 dark:text-slate-400'}`}>
                    {label}
                </span>
                {subtext && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtext}</p>}
            </div>
            <span
                className={`text-sm font-medium ml-4 tabular-nums shrink-0 ${highlight
                    ? value >= 0
                        ? 'text-green-700 dark:text-emerald-400 font-bold'
                        : 'text-red-600 dark:text-red-400 font-bold'
                    : bold
                        ? 'text-gray-800 dark:text-slate-200 font-semibold'
                        : value < 0
                            ? 'text-green-600 dark:text-emerald-400'
                            : 'text-gray-700 dark:text-slate-300'
                    }`}
            >
                {formatCurrency(value)}
            </span>
        </div>
    )
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
    label,
    value,
    sub,
    accent,
    tooltip,
}: {
    label: string
    value: string
    sub?: string
    accent: 'blue' | 'purple' | 'pink' | 'green' | 'red'
    tooltip?: string
}) {
    const [show, setShow] = useState(false)
    const topBorder: Record<string, string> = {
        blue: 'border-t-blue-500',
        purple: 'border-t-violet-500',
        pink: 'border-t-pink-500',
        green: 'border-t-emerald-500',
        red: 'border-t-red-500',
    }
    const labelColor: Record<string, string> = {
        blue: 'text-blue-600',
        purple: 'text-violet-600',
        pink: 'text-pink-600',
        green: 'text-emerald-600',
        red: 'text-red-600',
    }
    return (
        <div
            className={`relative bg-white dark:bg-sn-card rounded-xl border border-gray-100 dark:border-white/5 border-t-4 ${topBorder[accent]} px-4 py-3 cursor-default shadow-sm dark:shadow-none`}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            <p className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${labelColor[accent]}`}>{label}</p>
            <p className="text-2xl font-heading font-bold text-gray-900 dark:text-slate-100 mt-1 tabular-nums leading-tight">{value}</p>
            {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">{sub}</p>}
            {tooltip && show && (
                <div className="absolute z-20 bottom-full left-0 mb-2 w-60 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-2xl leading-relaxed pointer-events-none">
                    {tooltip}
                    <div className="absolute top-full left-5 border-4 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    )
}

// ─── Animated Income Flow Row ─────────────────────────────────────────────────

/**
 * A single row in the "How your income is taxed" waterfall.
 *
 * Animation: bar starts at 0% width and grows to `pct`% using a CSS transition
 * triggered by the parent-controlled `animate` flag. The `delay` is a CSS
 * transition-delay so rows stagger smoothly without any per-row timers.
 *
 * Description text is always in the DOM at a fixed height and fades with
 * `opacity` — this prevents the layout-shift jitter that occurred when the
 * element was conditionally mounted/unmounted.
 */
function FlowRow({
    label,
    value,
    total,
    barColor,
    negative,
    bold,
    description,
    animate,
    delay,
}: {
    label: string
    value: number
    total: number
    barColor: string
    negative?: boolean
    bold?: boolean
    description?: string
    animate: boolean
    delay: number
}) {
    const [showDesc, setShowDesc] = useState(false)
    const pct = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 4
    return (
        <div
            className="cursor-default"
            onMouseEnter={() => setShowDesc(true)}
            onMouseLeave={() => setShowDesc(false)}
        >
            <div className="flex items-center gap-3 py-1">
                {/* Label — right-aligned in a fixed-width slot */}
                <div className="w-32 shrink-0 text-right">
                    <span className={`text-sm leading-tight ${bold ? 'font-semibold text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
                        {label}
                    </span>
                </div>
                {/* Animated proportional bar */}
                <div className="flex-1 h-4 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{
                            width: animate ? `${pct}%` : '0%',
                            transition: `width 0.85s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
                        }}
                    />
                </div>
                {/* Euro amount */}
                <div className="w-24 shrink-0 text-right">
                    <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-gray-900 dark:text-slate-100' : negative ? 'text-red-500' : 'text-gray-700 dark:text-slate-300'
                        }`}>
                        {negative ? '−' : ''}{formatCurrency(value)}
                    </span>
                </div>
                {/* Percentage badge */}
                <div className="w-10 shrink-0 text-right">
                    <span className="text-xs text-gray-400 dark:text-slate-500 tabular-nums">{pct}%</span>
                </div>
            </div>
            {/* Fixed-height description area — opacity transition prevents layout shift */}
            <div className="h-4 pl-36 mt-0.5">
                <p
                    className="text-xs text-gray-400 italic truncate transition-opacity duration-200"
                    style={{ opacity: showDesc ? 1 : 0 }}
                >
                    {description}
                </p>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TaxBreakdownComponent({ breakdown: b }: TaxBreakdownProps) {
    // Trigger waterfall animation after mount — all bars animate simultaneously
    // but use individual CSS transition-delays for a stagger effect.
    const [waterfallVisible, setWaterfallVisible] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setWaterfallVisible(true), 80)
        return () => clearTimeout(t)
    }, [])

    const chartData = [
        { name: 'Income Tax', value: b.tarifliche_est, color: '#3b82f6' },
        { name: 'Soli', value: b.solidaritaetszuschlag, color: '#8b5cf6' },
        { name: 'Church Tax', value: b.kirchensteuer, color: '#ec4899' },
        { name: 'Capital Tax', value: b.capital_tax_due, color: '#f59e0b' },
    ].filter((d) => d.value > 0)

    const isRefund = b.refund_or_payment >= 0
    const totalDeductions = b.gross_income - b.zve
    const deductionPct = b.gross_income > 0 ? Math.round((totalDeductions / b.gross_income) * 100) : 0

    return (
        <div className="space-y-5">
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard
                    label="Total Tax"
                    value={formatCurrency(b.total_tax)}
                    sub={`${formatPercent(b.effective_rate)} effective`}
                    accent="blue"
                    tooltip="Income tax (§32a EStG) + solidarity surcharge + church tax + capital gains tax. This is what you legally owe the Finanzamt."
                />
                <SummaryCard
                    label="Effective Rate"
                    value={formatPercent(b.effective_rate)}
                    sub="avg across all income"
                    accent="purple"
                    tooltip="Your effective (average) tax rate: total tax ÷ gross income. Lower than marginal because lower slices of your income are taxed at lower rates."
                />
                <SummaryCard
                    label="Marginal Rate"
                    value={formatPercent(b.marginal_rate)}
                    sub={`~${formatCurrency(Math.round(1000 * b.marginal_rate))} saved per €1k`}
                    accent="pink"
                    tooltip={`The rate on your LAST euro of income. Each additional €1,000 deduction saves ~${formatCurrency(Math.round(1000 * b.marginal_rate))} in tax.`}
                />
                <SummaryCard
                    label={isRefund ? 'Tax Refund' : 'Tax Due'}
                    value={formatCurrency(Math.abs(b.refund_or_payment))}
                    accent={isRefund ? 'green' : 'red'}
                    tooltip={isRefund
                        ? `You overpaid ${formatCurrency(Math.abs(b.refund_or_payment))} via payroll withholding (Lohnsteuer). File your return to get this back.`
                        : `After payroll withholding, you still owe ${formatCurrency(Math.abs(b.refund_or_payment))}. This is due when your Steuerbescheid arrives.`
                    }
                />
            </div>

            {/* ── Income flow waterfall ── */}
            <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">How your income is taxed</h3>
                    <span className="text-xs text-gray-400">hover any row for details</span>
                </div>
                <div>
                    <FlowRow
                        label="Gross income"
                        value={b.gross_income}
                        total={b.gross_income}
                        barColor="bg-gray-300"
                        description="Your total pre-tax income from all sources"
                        animate={waterfallVisible}
                        delay={0}
                    />
                    <FlowRow
                        label={`Deductions (${deductionPct}%)`}
                        value={totalDeductions}
                        total={b.gross_income}
                        barColor="bg-blue-300"
                        negative
                        description="Werbungskosten, Sonderausgaben, allowances — reduce your taxable base"
                        animate={waterfallVisible}
                        delay={130}
                    />
                    <div className="border-t border-dashed border-gray-200 my-1 ml-36" />
                    <FlowRow
                        label="Taxable (ZVE)"
                        value={b.zve}
                        total={b.gross_income}
                        barColor="bg-indigo-500"
                        bold
                        description="Zu versteuerndes Einkommen — the amount §32a EStG applies to"
                        animate={waterfallVisible}
                        delay={260}
                    />
                    <FlowRow
                        label="Total tax"
                        value={b.total_tax}
                        total={b.gross_income}
                        barColor="bg-red-400"
                        negative
                        description={`Income tax${b.solidaritaetszuschlag > 0 ? ' + Soli' : ''}${b.kirchensteuer > 0 ? ' + church tax' : ''}${b.capital_tax_due > 0 ? ' + capital tax' : ''}`}
                        animate={waterfallVisible}
                        delay={390}
                    />
                    <div className="border-t border-dashed border-gray-200 my-1 ml-36" />
                    <FlowRow
                        label={isRefund ? 'Refund' : 'Extra due'}
                        value={Math.abs(b.refund_or_payment)}
                        total={b.gross_income}
                        barColor={isRefund ? 'bg-emerald-400' : 'bg-orange-400'}
                        negative={!isRefund}
                        bold
                        description={isRefund
                            ? `Withheld ${formatCurrency(b.total_withheld)} → you overpaid ${formatCurrency(Math.abs(b.refund_or_payment))}`
                            : `Withheld ${formatCurrency(b.total_withheld)} → you still owe ${formatCurrency(Math.abs(b.refund_or_payment))}`
                        }
                        animate={waterfallVisible}
                        delay={520}
                    />
                </div>
            </div>

            {/* ── Tax components bar chart ── */}
            {chartData.length > 0 && (
                <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">Tax component breakdown</h3>
                    <ResponsiveContainer width="100%" height={chartData.length > 2 ? 160 : 100}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                            <XAxis
                                type="number"
                                tickFormatter={(v) => `€${(v / 1_000).toFixed(0)}k`}
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={90}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(v: number) => [formatCurrency(v), '']}
                                contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)' }}
                            />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                {chartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Detailed breakdown ── */}
            <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-100 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                <Divider label="Income" />
                {(b.employment_gross ?? 0) > 0 && (
                    <Row label="Employment income (gross)" value={b.employment_gross!} />
                )}
                {(b.self_employed_net ?? 0) > 0 && (
                    <Row label="Self-employed income (net)" value={b.self_employed_net!} />
                )}
                {(b.rental_net ?? 0) > 0 && (
                    <Row label="Rental income (net)" value={b.rental_net!} />
                )}
                {(b.investment_income ?? 0) > 0 && (
                    <Row
                        label="Investment income (Kapitalvermögen)"
                        value={b.investment_income!}
                        subtext="Taxed at flat 25% + Soli (Abgeltungsteuer)"
                    />
                )}
                {(b.teilfreistellung_applied ?? 0) > 0 && (
                    <Row
                        label="ETF tax exemption (Teilfreistellung)"
                        value={-(b.teilfreistellung_applied!)}
                        indent
                        subtext={`${b.investment_income ? Math.round((b.teilfreistellung_applied! / b.investment_income) * 100) : 0}% of investment income exempt under InvStG 2018`}
                    />
                )}

                <Divider label="Deductions" />
                <Row
                    label={
                        (b.werbungskosten_actual ?? 0) > (b.werbungskosten_pauschale ?? 0)
                            ? 'Work expenses — actual (Werbungskosten)'
                            : 'Work expenses — lump sum (Werbungskosten-Pauschale €1,230)'
                    }
                    value={-(b.werbungskosten_used)}
                    indent
                    subtext={
                        (b.werbungskosten_actual ?? 0) > (b.werbungskosten_pauschale ?? 0)
                            ? `Actual €${(b.werbungskosten_actual ?? 0).toFixed(0)} used`
                            : `Your actual €${(b.werbungskosten_actual ?? 0).toFixed(0)} was lower — Pauschale applied`
                    }
                />
                {b.sonderausgaben_used > 0 && (
                    <Row label="Special expenses (Sonderausgaben)" value={-b.sonderausgaben_used} indent />
                )}
                {(b.aussergewoehnliche_belastungen ?? 0) > 0 && (
                    <Row
                        label="Extraordinary burdens (§33 EStG)"
                        value={-(b.aussergewoehnliche_belastungen!)}
                        indent
                    />
                )}
                {(b.disability_pauschbetrag_used ?? 0) > 0 && (
                    <Row
                        label="Disability allowance (§33b EStG)"
                        value={-(b.disability_pauschbetrag_used!)}
                        indent
                        subtext="Flat-rate Behinderten-Pauschbetrag"
                    />
                )}
                {b.kinderfreibetrag_used > 0 && (
                    <Row
                        label="Child tax allowance (Kinderfreibetrag)"
                        value={-b.kinderfreibetrag_used}
                        indent
                        subtext="Applied instead of Kindergeld (more beneficial)"
                    />
                )}

                <Divider label="Tax Calculation" />
                <Row label="Taxable income (zu versteuerndes Einkommen, ZVE)" value={b.zve} bold />
                <Row label="Income tax (§32a EStG)" value={b.tarifliche_est} indent />
                {b.solidaritaetszuschlag > 0 && (
                    <Row label="Solidarity surcharge (Soli)" value={b.solidaritaetszuschlag} indent />
                )}
                {b.kirchensteuer > 0 && (
                    <Row label="Church tax (Kirchensteuer)" value={b.kirchensteuer} indent />
                )}
                {b.capital_tax_flat > 0 && (
                    <Row label="Investment flat tax (Abgeltungsteuer)" value={b.capital_tax_flat} indent />
                )}
                <div className="border-t border-gray-100 dark:border-white/5 mt-2 pt-1">
                    <Row label="Total tax" value={b.total_tax} bold />
                </div>

                <Divider label="Already Paid (Withheld)" />
                {(b.lohnsteuer_withheld ?? 0) > 0 && (
                    <Row label="Lohnsteuer withheld by employer" value={b.lohnsteuer_withheld!} indent />
                )}
                {(b.soli_withheld ?? 0) > 0 && (
                    <Row label="Soli withheld by employer" value={b.soli_withheld!} indent />
                )}
                {(b.kirchensteuer_withheld ?? 0) > 0 && (
                    <Row label="Church tax withheld by employer" value={b.kirchensteuer_withheld!} indent />
                )}
                {(b.capital_tax_withheld ?? 0) > 0 && (
                    <Row label="Investment tax withheld by bank" value={b.capital_tax_withheld!} indent />
                )}
                <div className="border-t border-gray-100 dark:border-white/5 mt-2 pt-1">
                    <Row label="Total withheld" value={b.total_withheld} bold />
                </div>

                <Divider label="Bottom Line" />
                {b.kindergeld_annual > 0 && b.kinderfreibetrag_used === 0 && (
                    <Row
                        label="Child benefit (Kindergeld) received"
                        value={b.kindergeld_annual}
                        indent
                        subtext="More beneficial than Kinderfreibetrag for your situation"
                    />
                )}
                <Row
                    label={isRefund ? '🎉 Estimated tax refund' : '⚠ Estimated tax payment due'}
                    value={b.refund_or_payment}
                    bold
                    highlight
                />
            </div>

            {/* ── Tax saving suggestions ── */}
            {b.suggestions && b.suggestions.length > 0 && (
                <div className="relative overflow-hidden bg-white dark:bg-sn-card rounded-2xl border border-amber-200/60 dark:border-amber-500/20 p-5 shadow-sm dark:shadow-none">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-400 dark:bg-amber-500 rounded-l-2xl" />
                    <div className="pl-3">
                        <p className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2">// Tax Saving Tips</p>
                        <ul className="space-y-1.5">
                            {b.suggestions.map((s, i) => (
                                <li key={i} className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                                    • {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}

