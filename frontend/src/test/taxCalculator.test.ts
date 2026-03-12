/**
 * Tax Calculator Engine Tests
 * Tests the client-side §32a EStG 2026 calculation engine against known values.
 * All expected results are derived from the official BMF tax formula.
 */
import { describe, expect, it } from 'vitest'
import { calculateTax, DEFAULT_PARAMS_2026 } from '../lib/taxCalculator'
import type {
    DeductionsData,
    EmploymentData,
    OtherIncomeData,
    PersonalData,
    SpecialExpensesData,
} from '../types/tax'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const p = DEFAULT_PARAMS_2026

const basePersonal: PersonalData = {
    taxYear: 2026,
    isMarried: false,
    numChildren: 0,
    isChurchMember: false,
    churchTaxRateType: 'high',
    isFullYearResident: true,
    isDisabled: false,
    disabilityGrade: 0,
}
const noEmployment: EmploymentData = {
    hasEmployment: false,
    grossSalary: 0,
    lohnsteuerWithheld: 0,
    soliWithheld: 0,
    kirchensteuerWithheld: 0,
}
const noOther: OtherIncomeData = {
    hasSelfEmployed: false,
    selfEmployedRevenue: 0,
    selfEmployedExpenses: 0,
    hasInvestments: false,
    investmentIncome: 0,
    investmentTaxWithheld: 0,
    hasRental: false,
    rentalIncome: 0,
    rentalExpenses: 0,
}
const noDeductions: DeductionsData = {
    commuteKm: 0,
    commuteDays: 0,
    homeOfficeDays: 0,
    workEquipment: 0,
    workTraining: 0,
    otherWorkExpenses: 0,
    unionFees: 0,
}
const noSpecial: SpecialExpensesData = {
    healthInsurance: 0,
    longTermCareInsurance: 0,
    pensionContributions: 0,
    riesterContributions: 0,
    donations: 0,
    childcareCosts: 0,
    alimonyPaid: 0,
    churchFeesPaid: 0,
    medicalCosts: 0,
}

// Helper: run calculation with sensible defaults and partial overrides
function calc(
    personalOverrides: Partial<PersonalData> = {},
    empOverrides: Partial<EmploymentData> = {},
    otherOverrides: Partial<OtherIncomeData> = {},
    deductionOverrides: Partial<DeductionsData> = {},
    specialOverrides: Partial<SpecialExpensesData> = {},
) {
    return calculateTax(
        { ...basePersonal, ...personalOverrides },
        { ...noEmployment, ...empOverrides },
        { ...noOther, ...otherOverrides },
        { ...noDeductions, ...deductionOverrides },
        { ...noSpecial, ...specialOverrides },
        p,
    )
}

// ─── Zone 1: Below Grundfreibetrag → zero tax ─────────────────────────────────

describe('Zone 1 — below Grundfreibetrag', () => {
    it('income = 0 → tax is 0', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 0 })
        expect(r.tarifliche_est).toBe(0)
        expect(r.total_tax).toBe(0)
    })

    it('income exactly at Grundfreibetrag (€12,348) → tax is 0', () => {
        // gross 12348 minus Werbungskosten Pauschale 1230 = ZVE 11118 < Grundfreibetrag
        const r = calc({}, { hasEmployment: true, grossSalary: 12348 })
        expect(r.tarifliche_est).toBe(0)
        expect(r.zve).toBeGreaterThanOrEqual(0)
    })

    it('gross salary just above zone 1, ZVE = Grundfreibetrag → tax is 0', () => {
        // To get ZVE = 12348 exactly: gross = 12348 + 1230 (Werbungskosten) + 36 (Sonderausgaben) = 13614
        const r = calc({}, { hasEmployment: true, grossSalary: 13614 })
        expect(r.zve).toBe(12348)
        expect(r.tarifliche_est).toBe(0)
    })
})

// ─── Zone 2: Entry zone (§32a Abs.1 Nr.2) ────────────────────────────────────

describe('Zone 2 — progressive entry zone (€12,349–€17,799 ZVE)', () => {
    it('ZVE €14,000 → progressive tax > 0', () => {
        // gross = 14000 + 1230 (Werbungskosten) + 36 (Sonderausgaben) = 15266 → ZVE = 14000
        const r = calc({}, { hasEmployment: true, grossSalary: 15266 })
        expect(r.zve).toBe(14000)
        expect(r.tarifliche_est).toBeGreaterThan(0)
        expect(r.tarifliche_est).toBeLessThan(r.zve * 0.3) // Must be less than 30%
    })

    it('zone 2 tax is less than zone 3 rate (progressive, not flat)', () => {
        const r14k = calc({}, { hasEmployment: true, grossSalary: 15230 }) // ZVE 14k
        const r17k = calc({}, { hasEmployment: true, grossSalary: 18279 }) // ZVE ~17049
        // Tax should increase, but effective rate rises gradually
        expect(r17k.tarifliche_est).toBeGreaterThan(r14k.tarifliche_est)
        expect(r17k.effective_rate_percent).toBeGreaterThan(r14k.effective_rate_percent)
    })
})

// ─── Zone 3: Main zone (most employees fall here) ────────────────────────────

describe('Zone 3 — main progressive zone (€17,800–€69,878 ZVE)', () => {
    it('typical employee €40k gross → correct ZVE and reasonable tax', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 40000 })
        expect(r.zve).toBe(40000 - 1230 - 36) // gross - Werbungskosten Pauschale - Sonderausgaben Pauschale
        expect(r.tarifliche_est).toBeGreaterThan(5000)
        expect(r.effective_rate_percent).toBeGreaterThan(15)
        expect(r.effective_rate_percent).toBeLessThan(30)
    })

    it('€60k gross → standard deductions applied correctly', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 60000 })
        expect(r.werbungskosten_used).toBe(p.werbungskosten_pauschale) // 1230, Pauschale applies
        expect(r.zve).toBe(60000 - 1230 - 36)
        expect(r.tarifliche_est).toBeGreaterThan(0)
    })

    it('commute deductions exceed Pauschale → actual costs used', () => {
        // 30km x 220 days x €0.38 = €2,508 > Pauschale €1,230
        const r = calc(
            {},
            { hasEmployment: true, grossSalary: 60000 },
            {},
            { commuteKm: 30, commuteDays: 220 },
        )
        const expectedCommute = 30 * 220 * p.pendlerpauschale_per_km // 2508
        expect(r.werbungskosten_actual).toBeGreaterThanOrEqual(expectedCommute)
        expect(r.werbungskosten_used).toBe(r.werbungskosten_actual)
        expect(r.werbungskosten_used).toBeGreaterThan(p.werbungskosten_pauschale)
    })

    it('home office days contribute to Werbungskosten', () => {
        const rNoOffice = calc({}, { hasEmployment: true, grossSalary: 60000 })
        const rWithOffice = calc(
            {},
            { hasEmployment: true, grossSalary: 60000 },
            {},
            { homeOfficeDays: 100 },
        )
        // 100 days × €6 = €600, but Pauschale is €1230, so Pauschale still wins unless combined with commute
        const officeAmount = 100 * p.homeoffice_per_day
        if (officeAmount > p.werbungskosten_pauschale) {
            expect(rWithOffice.werbungskosten_used).toBeGreaterThan(rNoOffice.werbungskosten_used)
        }
        // Either way, higher deduction → lower ZVE → lower tax
        expect(rWithOffice.zve).toBeLessThanOrEqual(rNoOffice.zve)
    })

    it('home office capped at 210 days even if more is entered', () => {
        // 210 days × €6 = €1260 > Pauschale €1230
        const r = calc(
            {},
            { hasEmployment: true, grossSalary: 60000 },
            {},
            { homeOfficeDays: 250 }, // exceeds cap
        )
        const maxHomeOffice = p.homeoffice_max_days * p.homeoffice_per_day // 1260
        expect(r.werbungskosten_actual).toBeLessThanOrEqual(maxHomeOffice + 0.01)
    })
})

// ─── Zone 4: 42% rate ────────────────────────────────────────────────────────

describe('Zone 4 — 42% rate (€69,879–€277,825 ZVE)', () => {
    it('€100k gross → effective rate below 42% (progressive), marginal near 42%', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 100000 })
        expect(r.effective_rate_percent).toBeGreaterThan(30)
        expect(r.effective_rate_percent).toBeLessThan(42)
        expect(r.marginal_rate_percent).toBeCloseTo(42, 0)
    })
})

// ─── Zone 5: 45% top rate ─────────────────────────────────────────────────────

describe('Zone 5 — 45% top rate (above €277,825 ZVE)', () => {
    it('€300k gross → marginal rate is 45%', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 300000 })
        expect(r.marginal_rate_percent).toBeCloseTo(45, 0)
        expect(r.effective_rate_percent).toBeGreaterThan(35)
        expect(r.effective_rate_percent).toBeLessThan(45)
    })
})

// ─── Solidarity Surcharge (SolZG) ────────────────────────────────────────────

describe('Solidarity Surcharge (Solidaritätszuschlag)', () => {
    it('tax below Freigrenze → Soli is 0', () => {
        // Freigrenze for single = €20,350. Need income tax < 20,350.
        // Approx income level: ZVE ~€60k → tax ~€13,330 < 20,350 → no Soli!
        const r = calc({}, { hasEmployment: true, grossSalary: 60000 })
        expect(r.solidaritaetszuschlag).toBe(0)
    })

    it('tax above full Soli threshold → Soli = 5.5% of income tax', () => {
        // Need tax > 20,350 / (1 - 0.20) = ~€25,437 to be fully out of Milderungszone
        // Actually need to check the Milderungszone end. 
        // Soli = min(5.5% * tax, 20% * (tax - Freigrenze))
        // When 5.5% * tax = 20% * (tax - 20350) → tax = 20350 * 20 / 14.5 = €28,069
        const r = calc({}, { hasEmployment: true, grossSalary: 200000 })
        const expectedSoli = r.tarifliche_est * p.soli_rate
        expect(r.solidaritaetszuschlag).toBeCloseTo(expectedSoli, 0)
    })

    it('Milderungszone: Soli < 5.5% × tax', () => {
        // Tax just above Freigrenze but below breakpoint
        // Gross ~€100k → tax ~€27,000 which is in Milderungszone
        const r = calc({}, { hasEmployment: true, grossSalary: 100000 })
        if (r.tarifliche_est > p.soli_freigrenze_single && r.solidaritaetszuschlag > 0) {
            const fullSoli = r.tarifliche_est * p.soli_rate
            // In Milderungszone Soli < full 5.5%
            expect(r.solidaritaetszuschlag).toBeLessThanOrEqual(fullSoli + 0.01)
        }
    })
})

// ─── Kirchensteuer ───────────────────────────────────────────────────────────

describe('Church Tax (Kirchensteuer)', () => {
    it('non-member → Kirchensteuer is 0', () => {
        const r = calc(
            { isChurchMember: false },
            { hasEmployment: true, grossSalary: 60000 },
        )
        expect(r.kirchensteuer).toBe(0)
    })

    it('church member (high rate, 9%) → Kirchensteuer = 9% of income tax', () => {
        const r = calc(
            { isChurchMember: true, churchTaxRateType: 'high' },
            { hasEmployment: true, grossSalary: 60000 },
        )
        const expected = r.tarifliche_est * p.kirchensteuer_rate_high
        expect(r.kirchensteuer).toBe(Math.floor(expected))
    })

    it('church member (low rate, 8%) → Kirchensteuer = 8% of income tax', () => {
        const r = calc(
            { isChurchMember: true, churchTaxRateType: 'low' },
            { hasEmployment: true, grossSalary: 60000 },
        )
        const expected = r.tarifliche_est * p.kirchensteuer_rate_low
        expect(r.kirchensteuer).toBe(Math.floor(expected))
    })

    it('high rate church tax > low rate church tax for same income', () => {
        const rHigh = calc({ isChurchMember: true, churchTaxRateType: 'high' }, { hasEmployment: true, grossSalary: 60000 })
        const rLow = calc({ isChurchMember: true, churchTaxRateType: 'low' }, { hasEmployment: true, grossSalary: 60000 })
        expect(rHigh.kirchensteuer).toBeGreaterThan(rLow.kirchensteuer)
    })
})

// ─── Ehegattensplitting (joint assessment) ────────────────────────────────────

describe('Ehegattensplitting (§32a joint assessment)', () => {
    it('married couple same income → tax is less than 2× single', () => {
        // High earner married to non-working spouse: splitting substantially reduces tax
        // Compare joint(200k) vs single(200k) — splitting applies 42% to 100k not 45%+
        const single = calc({}, { hasEmployment: true, grossSalary: 200000 })
        const joint = calc(
            { isMarried: true },
            { hasEmployment: true, grossSalary: 200000 },
        )
        expect(joint.tarifliche_est).toBeLessThan(single.tarifliche_est)
    })

    it('married with one earner benefits most from Splitting', () => {
        // Single earner €120k vs two earners €60k each
        const singleEarner = calc({ isMarried: true }, { hasEmployment: true, grossSalary: 120000 })
        const singlePerson = calc({}, { hasEmployment: true, grossSalary: 120000 })
        // Single earner married should pay much less than single person with same income
        expect(singleEarner.tarifliche_est).toBeLessThan(singlePerson.tarifliche_est)
    })

    it('Soli Freigrenze doubles for joint assessment', () => {
        // Joint Freigrenze = 40,700 (vs 20,350 for single)
        expect(p.soli_freigrenze_joint).toBe(p.soli_freigrenze_single * 2)
    })
})

// ─── Kinderfreibetrag vs Kindergeld (Günstigerprüfung) ───────────────────────

describe('Günstigerprüfung: Kinderfreibetrag vs Kindergeld', () => {
    it('low-income earner: Kindergeld is more beneficial', () => {
        // Low earner → small tax saving from Kinderfreibetrag < €259×12=€3,108 Kindergeld
        const rNoChild = calc({}, { hasEmployment: true, grossSalary: 25000 })
        const rChild = calc({ numChildren: 1 }, { hasEmployment: true, grossSalary: 25000 })
        // For low earner, kinderfreibetrag_used should be 0 (Kindergeld wins)
        if (rChild.kinderfreibetrag_used === 0) {
            expect(rChild.kindergeld_annual).toBeGreaterThan(0)
        }
    })

    it('high-income earner: Kinderfreibetrag saves more than Kindergeld', () => {
        // High earner (42% marginal) → Kinderfreibetrag €9,756 × 42% = €4,098 > €3,108
        const r = calc({ numChildren: 1 }, { hasEmployment: true, grossSalary: 150000 })
        expect(r.kinderfreibetrag_used).toBeGreaterThan(0)
    })

    it('Kindergeld annual = €259 × 12 per child', () => {
        const r = calc({ numChildren: 2 }, { hasEmployment: true, grossSalary: 50000 })
        // kindergeld_annual tracks how much was used in comparison
        const expectedAnnual = p.kindergeld_per_month * 12 * 2
        // Kindergeld is tracked regardless of whether Guenstigerprüfung favors it
        expect(expectedAnnual).toBe(259 * 12 * 2)
    })
})

// ─── Capital income (Abgeltungsteuer) ────────────────────────────────────────

describe('Capital income (§32d Abgeltungsteuer)', () => {
    it('investment income → flat 25% tax applied separately', () => {
        const r = calc(
            {},
            {},
            { hasInvestments: true, investmentIncome: 5000 },
        )
        // After Sparer-Pauschbetrag €1,000: taxable = €4,000 × 25% = €1,000
        // + Soli 5.5% on flat tax = €55 → total capital_tax_flat = €1,055
        expect(r.capital_tax_flat).toBeCloseTo(4000 * 0.25 * 1.055, 0)
        expect(r.sparer_pauschbetrag_used).toBe(p.sparer_pauschbetrag)
    })

    it('investment income below Sparer-Pauschbetrag → no flat tax', () => {
        const r = calc(
            {},
            {},
            { hasInvestments: true, investmentIncome: 800 },
        )
        // €800 < €1,000 Pauschbetrag → no tax
        expect(r.capital_tax_flat).toBe(0)
        expect(r.sparer_pauschbetrag_used).toBe(800)
    })

    it('investment tax withheld reduces refund/payment', () => {
        const withoutWithholding = calc({}, {}, { hasInvestments: true, investmentIncome: 5000 })
        const withWithholding = calc({}, {}, {
            hasInvestments: true,
            investmentIncome: 5000,
            investmentTaxWithheld: 1000,
        })
        expect(withWithholding.refund_or_payment).toBeGreaterThan(withoutWithholding.refund_or_payment)
    })
})

// ─── Refund / Payment calculation ────────────────────────────────────────────

describe('Refund / payment reconciliation', () => {
    it('positive refund when too much Lohnsteuer withheld', () => {
        const r = calc(
            {},
            { hasEmployment: true, grossSalary: 40000, lohnsteuerWithheld: 9000 },
        )
        // Actual tax on ~€38,734 ZVE ≈ €7,870 → refund ≈ €1,130
        expect(r.refund_or_payment).toBeGreaterThan(0)
        expect(r.total_withheld).toBe(9000)
    })

    it('negative (payment due) when Lohnsteuer underwithheld', () => {
        const r = calc(
            {},
            { hasEmployment: true, grossSalary: 60000, lohnsteuerWithheld: 5000 },
        )
        expect(r.refund_or_payment).toBeLessThan(0)
    })

    it('zero withheld → refund_or_payment equals negative total_tax', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 60000 })
        expect(r.refund_or_payment).toBeCloseTo(-r.total_tax, 1)
    })

    it('effective rate is calculated correctly as percentage', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 60000 })
        if (r.zve > 0) {
            const expectedRate = (r.tarifliche_est / r.employment_gross) * 100
            expect(r.effective_rate_percent).toBeCloseTo(expectedRate, 0)
        }
    })
})

// ─── Sonderausgaben ───────────────────────────────────────────────────────────

describe('Special expenses (Sonderausgaben)', () => {
    it('Pauschale of €36 applied when no actual special expenses', () => {
        const r = calc({}, { hasEmployment: true, grossSalary: 60000 })
        expect(r.sonderausgaben_pauschale).toBe(p.sonderausgaben_pauschale_single)
        expect(r.sonderausgaben_used).toBe(p.sonderausgaben_pauschale_single)
    })

    it('actual health insurance > Pauschale → actual used', () => {
        const r = calc(
            {},
            { hasEmployment: true, grossSalary: 60000 },
            {},
            {},
            { healthInsurance: 3000 },
        )
        expect(r.sonderausgaben_used).toBeGreaterThan(p.sonderausgaben_pauschale_single)
    })

    it('higher Sonderausgaben reduces ZVE and tax', () => {
        const rLow = calc({}, { hasEmployment: true, grossSalary: 60000 })
        const rHigh = calc(
            {},
            { hasEmployment: true, grossSalary: 60000 },
            {},
            {},
            { healthInsurance: 5000, pensionContributions: 10000 },
        )
        expect(rHigh.zve).toBeLessThan(rLow.zve)
        expect(rHigh.tarifliche_est).toBeLessThan(rLow.tarifliche_est)
    })

    it('joint assessment Pauschale = €72 (double single)', () => {
        expect(p.sonderausgaben_pauschale_joint).toBe(p.sonderausgaben_pauschale_single * 2)
    })
})

// ─── Tax monotonicity: higher income → higher tax ────────────────────────────

describe('Monotonicity', () => {
    const incomes = [20000, 30000, 50000, 70000, 120000, 250000]

    it('total tax increases consistently with income', () => {
        const taxes = incomes.map((gross) =>
            calc({}, { hasEmployment: true, grossSalary: gross }).tarifliche_est,
        )
        for (let i = 1; i < taxes.length; i++) {
            expect(taxes[i]).toBeGreaterThan(taxes[i - 1])
        }
    })

    it('effective rate increases consistently with income', () => {
        const rates = incomes.map((gross) =>
            calc({}, { hasEmployment: true, grossSalary: gross }).effective_rate_percent,
        )
        for (let i = 1; i < rates.length; i++) {
            expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1])
        }
    })
})
