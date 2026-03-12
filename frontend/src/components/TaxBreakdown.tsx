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
        <div className="flex items-center gap-3 my-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
            <div className="h-px flex-1 bg-gray-200" />
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
            className={`flex justify-between items-start rounded-lg py-1.5 px-2 transition-colors ${highlight ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'
                } ${indent ? 'pl-5' : ''}`}
        >
            <div className="flex-1">
                <span className={`text-sm ${bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {label}
                </span>
                {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
            </div>
            <span
                className={`text-sm font-medium ml-4 tabular-nums ${highlight
                    ? value >= 0
                        ? 'text-green-600 font-bold'
                        : 'text-red-600 font-bold'
                    : bold
                        ? 'text-gray-800 font-semibold'
                        : value < 0
                            ? 'text-green-600'
                            : 'text-gray-700'
                    }`}
            >
                {formatCurrency(value)}
            </span>
        </div>
    )
}

export default function TaxBreakdownComponent({ breakdown: b }: TaxBreakdownProps) {
    const chartData = [
        { name: 'Income Tax', value: b.tarifliche_est, color: '#3b82f6' },
        { name: 'Soli', value: b.solidaritaetszuschlag, color: '#8b5cf6' },
        { name: 'Church Tax', value: b.kirchensteuer, color: '#ec4899' },
        { name: 'Capital Tax', value: b.capital_tax_due, color: '#f59e0b' },
    ].filter((d) => d.value > 0)

    const isRefund = b.refund_or_payment >= 0

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryCard label="Total Tax" value={formatCurrency(b.total_tax)} accent="blue" />
                <SummaryCard label="Effective Rate" value={formatPercent(b.effective_rate)} accent="purple" />
                <SummaryCard label="Marginal Rate" value={formatPercent(b.marginal_rate)} accent="pink" />
                <SummaryCard
                    label={isRefund ? 'Tax Refund' : 'Tax Due'}
                    value={formatCurrency(Math.abs(b.refund_or_payment))}
                    accent={isRefund ? 'green' : 'red'}
                />
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Tax Breakdown</h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={chartData} layout="vertical">
                            <XAxis type="number" tickFormatter={(v) => `€${(v / 1_000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Detailed breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-0.5">
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
                <Row label="Solidarity surcharge (Soli)" value={b.solidaritaetszuschlag} indent />
                <Row label="Church tax (Kirchensteuer)" value={b.kirchensteuer} indent />
                {b.capital_tax_flat > 0 && (
                    <Row label="Investment flat tax (Abgeltungsteuer)" value={b.capital_tax_flat} indent />
                )}
                <div className="border-t border-gray-200 mt-1 pt-1">
                    <Row label="Total tax" value={b.total_tax} bold />
                </div>

                <Divider label="Already Paid (Withheld)" />
                {(b.lohnsteuer_withheld ?? 0) > 0 && (
                    <Row label="Lohnsteuer withheld by employer" value={b.lohnsteuer_withheld!} indent />
                )}
                {(b.capital_tax_withheld ?? 0) > 0 && (
                    <Row label="Investment tax withheld by bank" value={b.capital_tax_withheld!} indent />
                )}
                <div className="border-t border-gray-200 mt-1 pt-1">
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

            {/* Tax saving suggestions */}
            {b.suggestions && b.suggestions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2">💡 Tax Saving Tips</h3>
                    <ul className="space-y-1">
                        {b.suggestions.map((s, i) => (
                            <li key={i} className="text-sm text-amber-700">
                                • {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

function SummaryCard({
    label,
    value,
    accent,
}: {
    label: string
    value: string
    accent: 'blue' | 'purple' | 'pink' | 'green' | 'red'
}) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        pink: 'bg-pink-50 border-pink-200 text-pink-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
    }
    return (
        <div className={`rounded-xl border p-4 ${colors[accent]}`}>
            <p className="text-xs font-medium opacity-70">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
        </div>
    )
}

