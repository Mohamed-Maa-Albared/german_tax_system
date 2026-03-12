import { Info, TrendingDown, TrendingUp } from 'lucide-react'
import { formatEuro, formatPercent } from '../lib/utils'
import type { TaxCalculationResult } from '../types/tax'

interface TaxBreakdownProps {
    result: TaxCalculationResult
}

interface RowProps {
    label: string
    value: number
    indent?: boolean
    bold?: boolean
    highlight?: boolean
    negative?: boolean
    subtext?: string
    isPositive?: boolean
}

function Row({ label, value, indent, bold, highlight, subtext, isPositive }: RowProps) {
    if (value === 0 && !bold && !highlight) return null

    return (
        <div
            className={`flex justify-between items-start py-2 px-3 rounded-lg transition-colors ${highlight ? 'bg-brand-50 border border-brand-100' : 'hover:bg-slate-50'
                } ${indent ? 'pl-6' : ''}`}
        >
            <div className="flex-1">
                <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    {label}
                </span>
                {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
            </div>
            <span
                className={`text-sm font-medium ml-4 ${highlight
                        ? isPositive
                            ? 'text-green-600 font-bold'
                            : 'text-red-600 font-bold'
                        : bold
                            ? 'text-slate-800 font-semibold'
                            : 'text-slate-700'
                    }`}
            >
                {formatEuro(value)}
            </span>
        </div>
    )
}

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 my-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="h-px flex-1 bg-slate-200" />
        </div>
    )
}

export default function TaxBreakdown({ result }: TaxBreakdownProps) {
    const isRefund = result.refund_or_payment >= 0

    return (
        <div className="space-y-2">
            {/* Big result banner */}
            <div
                className={`rounded-2xl p-6 text-center ${isRefund
                        ? 'bg-gradient-to-br from-green-500 to-green-600'
                        : 'bg-gradient-to-br from-red-500 to-red-600'
                    } text-white shadow-lg`}
            >
                <div className="flex items-center justify-center gap-2 mb-1">
                    {isRefund ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    <span className="text-sm font-semibold opacity-90">
                        {isRefund ? 'Estimated Tax Refund' : 'Estimated Tax Payment Due'}
                    </span>
                </div>
                <div className="text-5xl font-extrabold tracking-tight">
                    {isRefund ? '+' : ''}{formatEuro(result.refund_or_payment)}
                </div>
                <p className="text-sm opacity-75 mt-2">
                    Tax year {result.tax_year} · Effective rate {formatPercent(result.effective_rate_percent)}
                    {result.marginal_rate_percent > 0 && ` · Marginal rate ${formatPercent(result.marginal_rate_percent)}`}
                </p>
            </div>

            {/* Calculation breakdown */}
            <div className="card p-4 space-y-1">
                <Divider label="Income" />

                {result.employment_gross > 0 && (
                    <Row label="Employment income (gross salary)" value={result.employment_gross} />
                )}
                {result.self_employed_net > 0 && (
                    <Row label="Self-employed income (net)" value={result.self_employed_net} />
                )}
                {result.rental_net !== 0 && (
                    <Row label="Rental income (net)" value={result.rental_net} />
                )}
                {result.investment_income > 0 && (
                    <Row
                        label="Investment income (Kapitalvermögen)"
                        value={result.investment_income}
                        subtext="Taxed at flat 25% + Soli (Abgeltungsteuer)"
                    />
                )}

                <Divider label="Deductions from employment" />

                <Row
                    label={
                        result.werbungskosten_used > result.werbungskosten_pauschale
                            ? `Work expenses — actual (Werbungskosten)`
                            : `Work expenses — lump sum (Werbungskosten-Pauschale)`
                    }
                    value={-result.werbungskosten_used}
                    indent
                    subtext={
                        result.werbungskosten_used > result.werbungskosten_pauschale
                            ? `Actual €${result.werbungskosten_actual.toFixed(0)} > Pauschale €${result.werbungskosten_pauschale.toFixed(0)}`
                            : `Lump sum applied (your actual €${result.werbungskosten_actual.toFixed(0)} was lower)`
                    }
                />

                <Divider label="Taxable income base" />

                <Row
                    label="Total income subject to progressive tax (Gesamtbetrag der Einkünfte)"
                    value={result.gesamtbetrag_der_einkuenfte}
                    bold
                />

                {result.sonderausgaben_used > 0 && (
                    <Row
                        label="Special expenses (Sonderausgaben)"
                        value={-result.sonderausgaben_used}
                        indent
                    />
                )}
                {result.aussergewoehnliche_belastungen > 0 && (
                    <Row
                        label="Extraordinary burdens (Außergewöhnliche Belastungen)"
                        value={-result.aussergewoehnliche_belastungen}
                        indent
                    />
                )}
                {result.kinderfreibetrag_used > 0 && (
                    <Row
                        label={`Child tax allowance — ${Math.round(result.kinderfreibetrag_used / 9756)} child(ren) (Kinderfreibetrag)`}
                        value={-result.kinderfreibetrag_used}
                        indent
                        subtext="Applied instead of Kindergeld (more beneficial)"
                    />
                )}

                <Divider label="Tax calculation" />

                <Row label="Taxable income (zu versteuerndes Einkommen, zvE)" value={result.zve} bold />
                <Row
                    label="Income tax (Einkommensteuer §32a EStG)"
                    value={result.tarifliche_est}
                    indent
                />
                {result.solidaritaetszuschlag > 0 && (
                    <Row
                        label="Solidarity surcharge (Solidaritätszuschlag)"
                        value={result.solidaritaetszuschlag}
                        indent
                    />
                )}
                {result.kirchensteuer > 0 && (
                    <Row
                        label="Church tax (Kirchensteuer)"
                        value={result.kirchensteuer}
                        indent
                    />
                )}
                {result.capital_tax_flat > 0 && (
                    <Row
                        label="Investment flat tax due (Abgeltungsteuer)"
                        value={result.capital_tax_flat}
                        indent
                    />
                )}

                <div className="border-t border-slate-200 mt-2 pt-2">
                    <Row label="Total tax" value={result.total_tax} bold />
                </div>

                <Divider label="Already paid (withheld)" />

                {result.lohnsteuer_withheld > 0 && (
                    <Row
                        label="Income tax withheld by employer (Lohnsteuer)"
                        value={result.lohnsteuer_withheld}
                        indent
                    />
                )}
                {result.soli_withheld > 0 && (
                    <Row
                        label="Soli withheld by employer"
                        value={result.soli_withheld}
                        indent
                    />
                )}
                {result.kirchensteuer_withheld > 0 && (
                    <Row
                        label="Church tax withheld"
                        value={result.kirchensteuer_withheld}
                        indent
                    />
                )}
                {result.capital_tax_withheld > 0 && (
                    <Row
                        label="Investment tax withheld by bank"
                        value={result.capital_tax_withheld}
                        indent
                    />
                )}
                <div className="border-t border-slate-200 mt-2 pt-2">
                    <Row label="Total withheld" value={result.total_withheld} bold />
                </div>

                <Divider label="Bottom line" />

                <Row
                    label={isRefund ? '🎉 Estimated refund' : '⚠️ Estimated payment due'}
                    value={result.refund_or_payment}
                    bold
                    highlight
                    isPositive={isRefund}
                />

                {result.kindergeld_annual > 0 && result.kinderfreibetrag_used === 0 && (
                    <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                        <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">
                            Child benefit (Kindergeld) of {formatEuro(result.kindergeld_annual)}/year was more
                            beneficial than the Kinderfreibetrag for your situation — it has been kept as-is.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
