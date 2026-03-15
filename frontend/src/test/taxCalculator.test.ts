/**
 * Comprehensive frontend tax calculator tests — 38 tests
 * Uses vitest with environment: 'node' (no jsdom needed for pure functions)
 */
import { describe, expect, it } from 'vitest'
import { calculateTax, DEFAULT_PARAMS_2026 } from '../lib/taxCalculator'
import {
    DeductionsData,
    EmploymentData,
    OtherIncomeData,
    PersonalData,
    SpecialExpensesData,
} from '../types/tax'

const p = DEFAULT_PARAMS_2026

const defaultPersonal: PersonalData = {
    isMarried: false,
    numChildren: 0,
    isChurchMember: false,
    churchTaxRateType: 'high',
    taxYear: 2026,
}

const defaultEmployment: EmploymentData = {
    grossSalary: 0,
    taxesWithheld: 0,
    bonus: 0,
}

const defaultOtherIncome: OtherIncomeData = {
    selfEmployedRevenue: 0,
    selfEmployedExpenses: 0,
    dividends: 0,
    capitalGains: 0,
    capitalTaxesWithheld: 0,
    rentalIncome: 0,
    rentalExpenses: 0,
}

const defaultDeductions: DeductionsData = {
    commuteKm: 0,
    commuteDays: 220,
    homeOfficeDays: 0,
    otherWorkExpenses: 0,
}

const defaultSpecialExpenses: SpecialExpensesData = {
    pensionContributions: 0,
    healthInsuranceContributions: 0,
    riesterContributions: 0,
    donations: 0,
    alimonyPaid: 0,
    churchTaxPriorYear: 0,
    childcareCosts: 0,
}

function calc(
    grossSalary: number,
    overrides: {
        personal?: Partial<PersonalData>
        employment?: Partial<EmploymentData>
        otherIncome?: Partial<OtherIncomeData>
        deductions?: Partial<DeductionsData>
        specialExpenses?: Partial<SpecialExpensesData>
    } = {},
) {
    return calculateTax(
        { ...defaultPersonal, ...overrides.personal },
        { ...defaultEmployment, grossSalary, ...overrides.employment },
        { ...defaultOtherIncome, ...overrides.otherIncome },
        { ...defaultDeductions, ...overrides.deductions },
        { ...defaultSpecialExpenses, ...overrides.specialExpenses },
        p,
    )
}

// ---------------------------------------------------------------------------
// Zone 1 — Grundfreibetrag
// ---------------------------------------------------------------------------

describe('Zone 1 — Grundfreibetrag', () => {
    it('zero income → zero tax', () => {
        const r = calc(0)
        expect(r.tarifliche_est).toBe(0)
        expect(r.total_tax).toBe(0)
    })

    it('gross 12000 → zero tax (below grundfreibetrag after deductions)', () => {
        const r = calc(12000)
        expect(r.tarifliche_est).toBe(0)
    })

    it('gross 13614 → ZVE exactly 12348 → zero tax', () => {
        // 13614 - 1230 (WK) - 36 (SA) = 12348 = grundfreibetrag
        const r = calc(13614)
        expect(r.zve).toBe(12348)
        expect(r.tarifliche_est).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// Zone 2
// ---------------------------------------------------------------------------

describe('Zone 2', () => {
    it('gross 15266 → ZVE 14000 → positive tax', () => {
        const r = calc(15266)
        expect(r.zve).toBe(14000)
        expect(r.tarifliche_est).toBeGreaterThan(0)
    })

    it('zone2 effective rate < 15%', () => {
        const r = calc(20000)
        expect(r.effective_rate).toBeLessThan(0.15)
    })

    it('zone2 tax increases with income', () => {
        const r1 = calc(18000)
        const r2 = calc(20000)
        expect(r2.tarifliche_est).toBeGreaterThan(r1.tarifliche_est)
    })
})

// ---------------------------------------------------------------------------
// Zone 3
// ---------------------------------------------------------------------------

describe('Zone 3', () => {
    it('gross 40000 → ZVE = 38734', () => {
        const r = calc(40000)
        expect(r.zve).toBe(38734)
    })

    it('zone3 effective rate > 10%', () => {
        const r = calc(50000)
        expect(r.effective_rate).toBeGreaterThan(0.10)
    })
})

// ---------------------------------------------------------------------------
// Zone 4 + 5
// ---------------------------------------------------------------------------

describe('Zone 4 & 5', () => {
    it('100k income → marginal rate ~42%', () => {
        const r = calc(100000)
        expect(r.marginal_rate).toBeCloseTo(0.42, 1)
    })

    it('350k income → marginal rate ~45%', () => {
        const r = calc(350000)
        expect(r.marginal_rate).toBeCloseTo(0.45, 1)
    })

    it('zone5 effective rate > 35%', () => {
        const r = calc(350000)
        expect(r.effective_rate).toBeGreaterThan(0.35)
    })
})

// ---------------------------------------------------------------------------
// Solidaritätszuschlag
// ---------------------------------------------------------------------------

describe('Solidaritätszuschlag', () => {
    it('no soli below freigrenze', () => {
        const r = calc(22000)
        if (r.tarifliche_est <= p.soli_freigrenze_single) {
            expect(r.solidaritaetszuschlag).toBe(0)
        }
    })

    it('soli at 5.5% rate for high income', () => {
        const r = calc(200000)
        expect(r.solidaritaetszuschlag).toBeCloseTo(r.tarifliche_est * p.soli_rate, -1)
    })

    it('married couple has higher soli freigrenze', () => {
        const single = calc(50000)
        const married = calc(50000, { personal: { isMarried: true } })
        expect(married.solidaritaetszuschlag).toBeLessThanOrEqual(single.solidaritaetszuschlag)
    })
})

// ---------------------------------------------------------------------------
// Kirchensteuer
// ---------------------------------------------------------------------------

describe('Kirchensteuer', () => {
    it('no church tax when not a member', () => {
        const r = calc(60000, { personal: { isChurchMember: false } })
        expect(r.kirchensteuer).toBe(0)
    })

    it('church tax = floor(tariff × 9%) for high rate members', () => {
        const r = calc(60000, { personal: { isChurchMember: true, churchTaxRateType: 'high' } })
        expect(r.kirchensteuer).toBe(Math.floor(r.tarifliche_est * 0.09))
    })

    it('low rate church tax < high rate', () => {
        const high = calc(60000, { personal: { isChurchMember: true, churchTaxRateType: 'high' } })
        const low = calc(60000, { personal: { isChurchMember: true, churchTaxRateType: 'low' } })
        expect(low.kirchensteuer).toBeLessThan(high.kirchensteuer)
    })
})

// ---------------------------------------------------------------------------
// Ehegattensplitting
// ---------------------------------------------------------------------------

describe('Ehegattensplitting', () => {
    it('married reduces tax for unequal incomes', () => {
        const single = calc(200000)
        const married = calc(200000, { personal: { isMarried: true } })
        expect(married.tarifliche_est).toBeLessThan(single.tarifliche_est)
    })
})

// ---------------------------------------------------------------------------
// Kinderfreibetrag / Kindergeld
// ---------------------------------------------------------------------------

describe('Kinderfreibetrag & Kindergeld', () => {
    it('no children → zero kindergeld and freibetrag', () => {
        const r = calc(50000, { personal: { numChildren: 0 } })
        expect(r.kindergeld_annual).toBe(0)
        expect(r.kinderfreibetrag_used).toBe(0)
    })

    it('2 children → kindergeld = 2 × 12 × 259 at low income', () => {
        const r = calc(30000, { personal: { numChildren: 2 } })
        expect(r.kindergeld_annual).toBe(2 * 12 * p.kindergeld_per_month)
    })

    it('high income with 1 child → freibetrag wins', () => {
        const r = calc(200000, { personal: { numChildren: 1 } })
        expect(r.kinderfreibetrag_used).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// Capital income
// ---------------------------------------------------------------------------

describe('Capital Income', () => {
    it('dividends below Pauschbetrag → no capital tax', () => {
        const r = calc(50000, { otherIncome: { dividends: 800 } })
        expect(r.capital_tax_flat).toBe(0)
    })

    it('dividends above Pauschbetrag → capital_tax_flat includes 5.5% Soli', () => {
        const r = calc(50000, { otherIncome: { dividends: 2000 } })
        const taxable = 2000 - p.sparer_pauschbetrag
        const expected = Math.floor(taxable * 0.25 * 1.055)
        expect(r.capital_tax_flat).toBe(expected)
    })

    it('withheld capital tax reduces capital_tax_due', () => {
        const r = calc(50000, {
            otherIncome: { dividends: 3000, capitalTaxesWithheld: 400 },
        })
        expect(r.capital_tax_due).toBe(Math.max(0, r.capital_tax_flat - 400))
    })
})

// ---------------------------------------------------------------------------
// Refund / payment
// ---------------------------------------------------------------------------

describe('Refund / Payment', () => {
    it('overpayment → positive refund_or_payment', () => {
        const r = calc(40000, { employment: { taxesWithheld: 20000, grossSalary: 40000, bonus: 0 } })
        expect(r.refund_or_payment).toBeGreaterThan(0)
    })

    it('no withholding → negative (owe tax)', () => {
        const r = calc(80000, { employment: { taxesWithheld: 0, grossSalary: 80000, bonus: 0 } })
        expect(r.refund_or_payment).toBeLessThan(0)
    })
})

// ---------------------------------------------------------------------------
// Werbungskosten
// ---------------------------------------------------------------------------

describe('Werbungskosten', () => {
    it('WK Pauschale applied when no deductions', () => {
        const r = calc(50000)
        expect(r.werbungskosten_used).toBe(p.werbungskosten_pauschale)
    })

    it('actual WK used when higher than Pauschale', () => {
        // 50km × 220days × 0.38 = 4180 > 1230
        const r = calc(50000, { deductions: { commuteKm: 50, commuteDays: 220, homeOfficeDays: 0, otherWorkExpenses: 0 } })
        expect(r.werbungskosten_used).toBeGreaterThan(p.werbungskosten_pauschale)
    })
})

// ---------------------------------------------------------------------------
// Monotonicity
// ---------------------------------------------------------------------------

describe('Monotonicity', () => {
    it('higher income always yields higher tax', () => {
        const incomes = [15000, 30000, 50000, 80000, 150000, 300000]
        const taxes = incomes.map((i) => calc(i).tarifliche_est)
        for (let idx = 1; idx < taxes.length; idx++) {
            expect(taxes[idx]).toBeGreaterThanOrEqual(taxes[idx - 1])
        }
    })
})

// ---------------------------------------------------------------------------
// §10d EStG — Loss carry-forward
// ---------------------------------------------------------------------------

describe('Loss carry-forward (§10d EStG)', () => {
    it('reduces ZVE by the carry-forward amount', () => {
        const r_no = calc(50000)
        const r_lf = calc(50000, {
            deductions: { commuteKm: 0, commuteDays: 0, homeOfficeDays: 0, otherWorkExpenses: 0, lossCarryForward: 5_000 },
        })
        expect(r_no.zve - r_lf.zve).toBeCloseTo(5_000, 0)
    })

    it('ZVE never goes below zero with huge carry-forward', () => {
        const r = calc(12000, {
            deductions: { commuteKm: 0, commuteDays: 0, homeOfficeDays: 0, otherWorkExpenses: 0, lossCarryForward: 999_999 },
        })
        expect(r.zve).toBeGreaterThanOrEqual(0)
    })

    it('reduces income tax', () => {
        const r_no = calc(60000)
        const r_lf = calc(60000, {
            deductions: { commuteKm: 0, commuteDays: 0, homeOfficeDays: 0, otherWorkExpenses: 0, lossCarryForward: 8_000 },
        })
        expect(r_lf.tarifliche_est).toBeLessThan(r_no.tarifliche_est)
    })
})

// ---------------------------------------------------------------------------
// Soli + KiSt withheld in total_withheld
// ---------------------------------------------------------------------------

describe('Soli and KiSt withheld in total_withheld', () => {
    it('soliWithheld is included in total_withheld', () => {
        const r = calc(80000, {
            employment: { grossSalary: 80000, taxesWithheld: 20000, bonus: 0, soliWithheld: 600 },
        })
        expect(r.total_withheld).toBe(20600)
        expect(r.soli_withheld).toBe(600)
    })

    it('kirchensteuerWithheld is included in total_withheld', () => {
        const r = calc(50000, {
            employment: { grossSalary: 50000, taxesWithheld: 10000, bonus: 0, kirchensteuerWithheld: 900 },
        })
        expect(r.total_withheld).toBe(10900)
        expect(r.kirchensteuer_withheld).toBe(900)
    })

    it('all three withheld types sum correctly', () => {
        const r = calc(100000, {
            employment: { grossSalary: 100000, taxesWithheld: 30000, bonus: 0, soliWithheld: 700, kirchensteuerWithheld: 1500 },
        })
        expect(r.total_withheld).toBe(32200)
    })
})
