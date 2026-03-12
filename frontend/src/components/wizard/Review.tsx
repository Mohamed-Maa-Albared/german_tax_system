import React from 'react'
import { useTaxStore } from '../../lib/store'
import { formatCurrency } from '../../lib/utils'

interface Props {
    onSubmit: () => void
    onBack: () => void
}

export default function Review({ onSubmit, onBack }: Props) {
    const { personal, employment, otherIncome, deductions, specialExpenses } = useTaxStore()

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Review Your Information</h2>

            <Section title="Personal">
                <Row k="Tax Year" v={String(personal.taxYear)} />
                <Row k="Married" v={personal.isMarried ? 'Yes' : 'No'} />
                <Row k="Children" v={String(personal.numChildren)} />
                <Row k="Church Member" v={personal.isChurchMember ? 'Yes' : 'No'} />
            </Section>

            <Section title="Employment">
                <Row k="Gross Salary" v={formatCurrency(employment.grossSalary)} />
                <Row k="Taxes Withheld" v={formatCurrency(employment.taxesWithheld)} />
                <Row k="Bonus" v={formatCurrency(employment.bonus)} />
            </Section>

            {(otherIncome.selfEmployedRevenue > 0 || otherIncome.dividends > 0 || otherIncome.rentalIncome > 0) && (
                <Section title="Other Income">
                    {otherIncome.selfEmployedRevenue > 0 && (
                        <Row k="Self-Employment Revenue" v={formatCurrency(otherIncome.selfEmployedRevenue)} />
                    )}
                    {otherIncome.dividends > 0 && (
                        <Row k="Dividends" v={formatCurrency(otherIncome.dividends)} />
                    )}
                    {otherIncome.rentalIncome > 0 && (
                        <Row k="Rental Income" v={formatCurrency(otherIncome.rentalIncome)} />
                    )}
                </Section>
            )}

            <Section title="Deductions">
                <Row k="Commute" v={`${deductions.commuteKm} km × ${deductions.commuteDays} days`} />
                <Row k="Home Office" v={`${deductions.homeOfficeDays} days`} />
                {deductions.otherWorkExpenses > 0 && (
                    <Row k="Other Work Expenses" v={formatCurrency(deductions.otherWorkExpenses)} />
                )}
            </Section>

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                    ← Back
                </button>
                <button
                    onClick={onSubmit}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                    Calculate Tax →
                </button>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
            </div>
            <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">{children}</tbody>
            </table>
        </div>
    )
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <tr>
            <td className="px-4 py-2 text-gray-500">{k}</td>
            <td className="px-4 py-2 text-right font-medium text-gray-800">{v}</td>
        </tr>
    )
}
