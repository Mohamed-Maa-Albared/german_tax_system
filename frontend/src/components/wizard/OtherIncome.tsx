import { useForm } from 'react-hook-form'
import { useTaxStore } from '../../lib/store'
import { OtherIncomeData } from '../../types/tax'
import AmountToggle, { useAmountMode } from '../AmountToggle'
import FieldHint from '../FieldHint'

interface Props {
    onNext: () => void
    onBack: () => void
}

export default function OtherIncome({ onNext, onBack }: Props) {
    const { otherIncome, updateOtherIncome } = useTaxStore()
    const { register, handleSubmit } = useForm<OtherIncomeData>({ defaultValues: otherIncome })
    const { mode, setMode, toAnnual } = useAmountMode()

    function onSubmit(data: OtherIncomeData) {
        updateOtherIncome({
            selfEmployedRevenue: toAnnual(data.selfEmployedRevenue),
            selfEmployedExpenses: toAnnual(data.selfEmployedExpenses),
            dividends: toAnnual(data.dividends),
            capitalGains: toAnnual(data.capitalGains),
            capitalTaxesWithheld: toAnnual(data.capitalTaxesWithheld),
            rentalIncome: toAnnual(data.rentalIncome),
            rentalExpenses: toAnnual(data.rentalExpenses),
            fundType: data.fundType ?? 'standard',
            vorabpauschale: toAnnual(data.vorabpauschale ?? 0),
        })
        onNext()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Other Income</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Leave all fields at 0 if they don't apply to you.
                    </p>
                </div>
                <div className="self-start sm:self-center pt-1 sm:pt-0">
                    <AmountToggle mode={mode} onChange={setMode} />
                </div>
            </div>

            {/* Self-employment */}
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1">
                    Self-Employment / Freelance Income
                    <FieldHint
                        explanation="Income from freelance work, consulting, or any self-employed activity where you are not on a company's payroll. You deduct your business costs and only pay tax on the profit."
                        germanTerm="Einkünfte aus selbständiger Arbeit / Gewerbebetrieb"
                        whereToFind="Your own invoices and bank statements. If you already filed an annual profit statement (EÜR), use those figures."
                    />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                        label="Total Revenue (€)"
                        hint={{ explanation: "All money received from clients/customers before deducting any costs.", germanTerm: "Betriebseinnahmen", whereToFind: "Add up all invoices you issued and received payment for during the year." }}
                        name="selfEmployedRevenue"
                        register={register}
                        mode={mode}
                    />
                    <Field
                        label="Business Expenses (€)"
                        hint={{ explanation: "Costs directly related to earning this income — tools, software, professional services, office supplies, travel, etc.", germanTerm: "Betriebsausgaben", whereToFind: "Your receipts and bank statements for business-related purchases." }}
                        name="selfEmployedExpenses"
                        register={register}
                        mode={mode}
                    />
                </div>
            </div>

            {/* Capital income */}
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1">
                    Investment &amp; Capital Income
                    <FieldHint
                        explanation="Interest, dividends, and profits from selling shares or funds. Germany taxes capital gains at a flat 25% (Abgeltungsteuer) plus Soli, after a €1,000 annual tax-free allowance (Sparer-Pauschbetrag). Your bank usually withholds this automatically."
                        germanTerm="Kapitalerträge / Abgeltungsteuer"
                        whereToFind="Your annual account statement (Jahresabrechnung / Steuerbescheinigung) from your bank or broker — sent each January/February."
                    />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                        label="Dividends (€)"
                        hint={{ explanation: "Payouts from shares or funds you own.", germanTerm: "Dividenden / Ausschüttungen", whereToFind: "Column 'Dividenden' or 'Ertragsausschüttung' on your bank's annual tax statement (Steuerbescheinigung)." }}
                        name="dividends"
                        register={register}
                        mode={mode}
                    />
                    <Field
                        label="Capital Gains (€)"
                        hint={{ explanation: "Profit from selling investments — shares, ETFs, bonds — for more than you bought them.", germanTerm: "Veräußerungsgewinne", whereToFind: "Column 'realisierte Kursgewinne' on your broker's annual tax statement." }}
                        name="capitalGains"
                        register={register}
                        mode={mode}
                    />
                    <Field
                        label="Capital Taxes Already Withheld (€)"
                        hint={{ explanation: "The 25% flat tax your bank/broker already deducted and paid to the tax office. If it is higher than your actual capital tax liability, you get a refund.", germanTerm: "Kapitalertragsteuer einbehalten", whereToFind: "Column 'einbehaltene Kapitalertragsteuer' on your bank's annual tax statement (Steuerbescheinigung)." }}
                        name="capitalTaxesWithheld"
                        register={register}
                        mode={mode}
                    />
                    {/* Vorabpauschale — advance lump-sum prepayment for ETFs */}
                    <Field
                        label="Vorabpauschale Already Withheld (€)"
                        hint={{ explanation: "A small pre-payment tax on ETFs that did not distribute dividends. Your broker withholds Abgeltungsteuer on this in January each year. Enter 0 if you don't hold accumulating ETFs, or if already included in your 'Capital Taxes Withheld' above.", germanTerm: "Vorabpauschale (§18 InvStG)", whereToFind: "Annual statement from your broker — look for 'Vorabpauschale' in the capital income section of your Jahressteuerbescheinigung." }}
                        name="vorabpauschale"
                        register={register}
                        mode={mode}
                    />
                </div>

                {/* ETF / fund type selector — drives Teilfreistellung */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Investment Fund Type
                        <FieldHint
                            explanation="Select the type of your investment fund. Since the 2018 InvStG reform, a portion of gains from investment funds is automatically tax-free (Teilfreistellung): 30% for equity ETFs, 15% for mixed funds, 60% for real estate funds. Select 'Standard' for individual shares, bonds, or savings accounts — no partial exemption applies."
                            germanTerm="Fondsart / Teilfreistellungsquote (InvStG 2018)"
                            whereToFind="Your broker's product information or fund factsheet. The fund category is listed as 'Aktienfonds' (equity), 'Mischfonds' (mixed), 'Immobilienfonds' (real estate), or 'Sonstige' (other/bond)."
                        />
                    </label>
                    <select
                        {...register('fundType')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                    >
                        <option value="standard">Standard (Stocks / Bonds / Savings — no exemption)</option>
                        <option value="equity_etf">Equity ETF / Aktienfonds — 30% tax-free</option>
                        <option value="mixed_fund">Mixed Fund / Mischfonds — 15% tax-free</option>
                        <option value="real_estate_fund">Real Estate Fund / Immobilienfonds — 60% tax-free</option>
                        <option value="bond_fund">Bond Fund / Rentenfonds — no exemption</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                        Teilfreistellung is applied to total dividends + capital gains above.
                    </p>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    €1,000 tax-free investment allowance (Sparer-Pauschbetrag) is applied automatically.
                </p>
            </div>

            {/* Rental income */}
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1">
                    Rental Income
                    <FieldHint
                        explanation="Income from renting out property — apartments, rooms, holiday lets, parking spaces, land. You can deduct mortgage interest, maintenance, depreciation, and management costs."
                        germanTerm="Einkünfte aus Vermietung und Verpachtung"
                        whereToFind="Your rental contracts and bank statements showing rent received. If you use a property management company, they should provide an annual statement."
                    />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                        label="Rental Income (€)"
                        hint={{ explanation: "Total rent received during the year, including utility advance payments.", germanTerm: "Mieteinnahmen", whereToFind: "Your bank statements showing rent payments received, or your rental statements." }}
                        name="rentalIncome"
                        register={register}
                        mode={mode}
                    />
                    <Field
                        label="Rental Expenses (€)"
                        hint={{ explanation: "Costs of the rental property: mortgage interest, maintenance, repairs, property management fees, insurance, depreciation (AfA). NOT the mortgage principal repayment.", germanTerm: "Werbungskosten aus V&V", whereToFind: "Your mortgage interest statement, receipts for repairs and maintenance, property management invoices." }}
                        name="rentalExpenses"
                        register={register}
                        mode={mode}
                    />
                </div>
            </div>

            <div className="flex justify-between">
                <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    ← Back
                </button>
                <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700">
                    Next →
                </button>
            </div>
        </form>
    )
}

function Field({
    label,
    hint,
    name,
    register,
    mode,
}: {
    label: string
    hint?: { explanation: string; germanTerm?: string; whereToFind?: string }
    name: keyof OtherIncomeData
    register: ReturnType<typeof useForm<OtherIncomeData>>['register']
    mode?: string
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label.replace('(€)', mode === 'monthly' ? '(€/month)' : '(€/year)')}
                {hint && <FieldHint {...hint} />}
            </label>
            <input
                type="number"
                min={0}
                step="any"
                {...register(name, { valueAsNumber: true, min: 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="0"
            />
        </div>
    )
}
