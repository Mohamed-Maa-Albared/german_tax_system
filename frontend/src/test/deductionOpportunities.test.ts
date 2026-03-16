/**
 * Tests for the deterministic deductionOpportunities engine.
 * Validates: opportunity detection, savings estimates, scoring, and edge cases.
 */
import { describe, expect, it } from 'vitest'
import { computeOpportunities } from '../lib/deductionOpportunities'
import { DEFAULT_PARAMS_2026 } from '../lib/taxCalculator'
import {
    DeductionsData,
    EmploymentData,
    OtherIncomeData,
    PersonalData,
    SpecialExpensesData,
} from '../types/tax'

const p = DEFAULT_PARAMS_2026

// ─── Test fixtures ─────────────────────────────────────────────────────────

const basePers: PersonalData = {
    isMarried: false,
    numChildren: 0,
    isChurchMember: false,
    churchTaxRateType: 'high',
    taxYear: 2026,
}

const baseEmp: EmploymentData = {
    grossSalary: 60_000,
    taxesWithheld: 14_000,
    bonus: 0,
}

const baseOther: OtherIncomeData = {
    selfEmployedRevenue: 0,
    selfEmployedExpenses: 0,
    dividends: 0,
    capitalGains: 0,
    capitalTaxesWithheld: 0,
    rentalIncome: 0,
    rentalExpenses: 0,
}

const baseDeductions: DeductionsData = {
    commuteKm: 0,
    commuteDays: 220,
    homeOfficeDays: 0,
    otherWorkExpenses: 0,
    workEquipment: 0,
    workTraining: 0,
    unionFees: 0,
}

const baseSpe: SpecialExpensesData = {
    pensionContributions: 0,
    healthInsuranceContributions: 0,
    longTermCareInsurance: 0,
    riesterContributions: 0,
    donations: 0,
    alimonyPaid: 0,
    churchTaxPriorYear: 0,
    childcareCosts: 0,
    medicalCosts: 0,
}

function opp(
    empOverrides: Partial<EmploymentData> = {},
    dedOverrides: Partial<DeductionsData> = {},
    speOverrides: Partial<SpecialExpensesData> = {},
    persOverrides: Partial<PersonalData> = {},
) {
    return computeOpportunities(
        { ...basePers, ...persOverrides },
        { ...baseEmp, ...empOverrides },
        baseOther,
        { ...baseDeductions, ...dedOverrides },
        { ...baseSpe, ...speOverrides },
        null,
        p,
    )
}

// ─── Health insurance detection ─────────────────────────────────────────────

describe('detectHealthInsurance', () => {
    it('detects zero health insurance on €60k salary', () => {
        const result = opp()
        const found = result.opportunities.find((o) => o.id === 'health_insurance_contributions')
        expect(found).toBeDefined()
        expect(found!.confidence).toBe('likely')
        expect(found!.alreadyClaiming).toBe(false)
    })

    it('does NOT detect if health insurance already entered', () => {
        const result = opp({}, {}, { healthInsuranceContributions: 3_500 })
        const found = result.opportunities.find((o) => o.id === 'health_insurance_contributions')
        expect(found).toBeUndefined()
    })

    it('estimated saving is positive', () => {
        const result = opp()
        const found = result.opportunities.find((o) => o.id === 'health_insurance_contributions')
        expect(found!.estimatedSavingMax).toBeGreaterThan(0)
    })
})

// ─── Home office detection ───────────────────────────────────────────────────

describe('detectHomeOffice', () => {
    it('detects when home office days is 0', () => {
        const result = opp({}, { homeOfficeDays: 0 })
        const found = result.opportunities.find((o) => o.id === 'home_office_days')
        expect(found).toBeDefined()
        expect(found!.confidence).toBe('needs-input')
    })

    it('detects partial home office below cap', () => {
        const result = opp({}, { homeOfficeDays: 100 })
        const found = result.opportunities.find((o) => o.id === 'home_office_days')
        expect(found).toBeDefined()
        expect(found!.alreadyClaiming).toBe(true)
        expect(found!.confidence).toBe('likely')
    })

    it('does NOT detect when at cap (210 days)', () => {
        const result = opp({}, { homeOfficeDays: 210 })
        const found = result.opportunities.find((o) => o.id === 'home_office_days')
        expect(found).toBeUndefined()
    })

    it('saving estimate uses €6/day × remaining days', () => {
        const result = opp({}, { homeOfficeDays: 0 })
        const found = result.opportunities.find((o) => o.id === 'home_office_days')!
        // 210 days × €6 × ~38% marginal rate = ~€478 max
        expect(found.estimatedSavingMax).toBeGreaterThan(100)
        expect(found.estimatedSavingMax).toBeLessThan(800)
    })
})

// ─── Union fees detection ────────────────────────────────────────────────────

describe('detectUnionFees', () => {
    it('detects when union fees is 0 and has salary', () => {
        const result = opp()
        const found = result.opportunities.find((o) => o.id === 'union_fees')
        expect(found).toBeDefined()
        expect(found!.confidence).toBe('needs-input')
    })

    it('does NOT detect when already entered', () => {
        const result = opp({}, { unionFees: 300 })
        const found = result.opportunities.find((o) => o.id === 'union_fees')
        expect(found).toBeUndefined()
    })

    it('does NOT detect when no employment income', () => {
        const result = opp({ grossSalary: 0 })
        const found = result.opportunities.find((o) => o.id === 'union_fees')
        expect(found).toBeUndefined()
    })
})

// ─── Childcare detection ─────────────────────────────────────────────────────

describe('detectChildcare', () => {
    it('detects when user has children but no childcare entered', () => {
        const result = opp({}, {}, { childcareCosts: 0 }, { numChildren: 2 })
        const found = result.opportunities.find((o) => o.id === 'childcare_costs')
        expect(found).toBeDefined()
        expect(found!.documents.length).toBeGreaterThan(0)
    })

    it('does NOT detect when no children', () => {
        const result = opp({}, {}, { childcareCosts: 0 }, { numChildren: 0 })
        const found = result.opportunities.find((o) => o.id === 'childcare_costs')
        expect(found).toBeUndefined()
    })

    it('does NOT detect when at cap (2 children × €4,800)', () => {
        const result = opp({}, {}, { childcareCosts: 10_000 }, { numChildren: 2 })
        const found = result.opportunities.find((o) => o.id === 'childcare_costs')
        expect(found).toBeUndefined()
    })

    it('cap hint mention correct per-child limit', () => {
        const result = opp({}, {}, { childcareCosts: 0 }, { numChildren: 1 })
        const found = result.opportunities.find((o) => o.id === 'childcare_costs')!
        // description should reference €4,800 for 1 child
        expect(found.description).toContain('4,800')
    })
})

// ─── Disability detection ────────────────────────────────────────────────────

describe('detectDisability', () => {
    it('detects when user has no disability marked', () => {
        const result = opp({}, {}, {}, { isDisabled: false, disabilityGrade: 0 })
        const found = result.opportunities.find((o) => o.id === 'disability_grade')
        expect(found).toBeDefined()
    })

    it('does NOT detect when disability already entered', () => {
        const result = opp({}, {}, {}, { isDisabled: true, disabilityGrade: 50 })
        const found = result.opportunities.find((o) => o.id === 'disability_grade')
        expect(found).toBeUndefined()
    })
})

// ─── Riester detection ───────────────────────────────────────────────────────

describe('detectRiester', () => {
    it('detects when riester is 0', () => {
        const result = opp({}, {}, { riesterContributions: 0 })
        const found = result.opportunities.find((o) => o.id === 'riester_contributions')
        expect(found).toBeDefined()
    })

    it('does NOT detect when at cap for single (€2,100)', () => {
        const result = opp({}, {}, { riesterContributions: 2_100 })
        const found = result.opportunities.find((o) => o.id === 'riester_contributions')
        expect(found).toBeUndefined()
    })

    it('joint cap is €4,200', () => {
        const result = opp({}, {}, { riesterContributions: 2_100 }, { isMarried: true })
        const found = result.opportunities.find((o) => o.id === 'riester_contributions')
        // still below joint cap so should be found
        expect(found).toBeDefined()
    })
})

// ─── Deduction Score ─────────────────────────────────────────────────────────

describe('deductionScore', () => {
    it('score is between 0 and 100', () => {
        const result = opp()
        expect(result.deductionScore).toBeGreaterThanOrEqual(0)
        expect(result.deductionScore).toBeLessThanOrEqual(100)
    })

    it('score increases when more deductions are already claimed', () => {
        const partialResult = opp({}, { homeOfficeDays: 0 })
        const fullResult = opp(
            {},
            { homeOfficeDays: 210 },
            { healthInsuranceContributions: 4_000, longTermCareInsurance: 900, riesterContributions: 2_100, donations: 500 },
        )
        expect(fullResult.deductionScore).toBeGreaterThanOrEqual(partialResult.deductionScore)
    })

    it('totalPotentialSavingMin is <= totalPotentialSavingMax', () => {
        const result = opp()
        expect(result.totalPotentialSavingMin).toBeLessThanOrEqual(result.totalPotentialSavingMax)
    })

    it('totalPotentialSavingMax is lower when most major deductions are already claimed', () => {
        const baseResult = opp()
        const optimisedResult = computeOpportunities(
            basePers,
            baseEmp,
            baseOther,
            { ...baseDeductions, homeOfficeDays: 210, workEquipment: 800, workTraining: 600, unionFees: 400 },
            {
                ...baseSpe,
                healthInsuranceContributions: 4_000,
                longTermCareInsurance: 900,
                riesterContributions: 2_100,
                donations: 2_000,
                pensionContributions: 30_000,
            },
            null,
            p,
        )
        // With most deductions claimed, unclaimed potential should be much lower than the empty baseline
        expect(optimisedResult.totalPotentialSavingMax).toBeLessThan(baseResult.totalPotentialSavingMax)
    })
})

// ─── Marginal rate ────────────────────────────────────────────────────────────

describe('marginalRate', () => {
    it('returns 0 for income below Grundfreibetrag', () => {
        const result = opp({ grossSalary: 12_000 })
        expect(result.marginalRate).toBe(0)
    })

    it('returns ~0.14–0.24 for zone 2 income', () => {
        const result = opp({ grossSalary: 16_000 })
        expect(result.marginalRate).toBeGreaterThanOrEqual(0.14)
        expect(result.marginalRate).toBeLessThanOrEqual(0.24)
    })

    it('returns 0.42 for zone 4 income (€80k)', () => {
        const result = opp({ grossSalary: 80_000 })
        expect(result.marginalRate).toBeCloseTo(0.42, 2)
    })

    it('returns 0.45 for zone 5 income (€300k+)', () => {
        const result = opp({ grossSalary: 300_000 })
        expect(result.marginalRate).toBe(0.45)
    })
})

// ─── Sorting ──────────────────────────────────────────────────────────────────

describe('opportunity sorting', () => {
    it('results are sorted by confidence (confirmed first) then saving desc', () => {
        const result = opp()
        const opps = result.opportunities
        for (let i = 0; i < opps.length - 1; i++) {
            const a = opps[i]
            const b = opps[i + 1]
            const order = { confirmed: 0, likely: 1, 'needs-input': 2 }
            if (order[a.confidence] === order[b.confidence]) {
                expect(a.estimatedSavingMax).toBeGreaterThanOrEqual(b.estimatedSavingMax)
            } else {
                expect(order[a.confidence]).toBeLessThanOrEqual(order[b.confidence])
            }
        }
    })
})

// ─── Documents ────────────────────────────────────────────────────────────────

describe('document lists', () => {
    it('every opportunity has at least one document listed', () => {
        const result = opp()
        result.opportunities.forEach((o) => {
            expect(o.documents.length).toBeGreaterThan(0)
        })
    })

    it('every opportunity has a law reference', () => {
        const result = opp()
        result.opportunities.forEach((o) => {
            expect(o.lawRef.length).toBeGreaterThan(0)
        })
    })
})

// ─── Teacher / civil-servant detectors ───────────────────────────────────────

const teacherPers: PersonalData = { ...basePers, occupationType: 'teacher_civil_servant' }

describe('detectTeacherMaterials', () => {
    it('detects opportunity when teacher has no materials entered', () => {
        const result = computeOpportunities(teacherPers, baseEmp, baseOther, baseDeductions, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).toContain('teacher_materials')
    })

    it('no opportunity for regular employee', () => {
        const result = computeOpportunities(basePers, baseEmp, baseOther, baseDeductions, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).not.toContain('teacher_materials')
    })

    it('suppressed when teacher already claims a sufficient amount', () => {
        const d = { ...baseDeductions, teacherMaterials: 600 }
        const result = computeOpportunities(teacherPers, baseEmp, baseOther, d, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).not.toContain('teacher_materials')
    })
})

describe('detectDoubleHousehold', () => {
    it('detects opportunity for teacher with no double household', () => {
        const result = computeOpportunities(teacherPers, baseEmp, baseOther, baseDeductions, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).toContain('double_household')
    })

    it('no opportunity for regular employee', () => {
        const result = computeOpportunities(basePers, baseEmp, baseOther, baseDeductions, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).not.toContain('double_household')
    })

    it('suppressed when double household months already entered', () => {
        const d = { ...baseDeductions, doubleHouseholdMonths: 6, doubleHouseholdCostsPerMonth: 800 }
        const result = computeOpportunities(teacherPers, baseEmp, baseOther, d, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).not.toContain('double_household')
    })
})

describe('detectArbeitszimmer', () => {
    it('suggests arbeitszimmer to freelancer using daily pauschale', () => {
        const freelancerPers: PersonalData = { ...basePers, occupationType: 'freelancer' }
        const d = { ...baseDeductions, homeOfficeDays: 100 }
        const result = computeOpportunities(freelancerPers, baseEmp, baseOther, d, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).toContain('arbeitszimmer')
    })

    it('does NOT suggest arbeitszimmer when already using it', () => {
        const freelancerPers: PersonalData = { ...basePers, occupationType: 'freelancer' }
        const d = { ...baseDeductions, homeOfficeDays: 0, homeOfficeType: 'arbeitszimmer' as const }
        const result = computeOpportunities(freelancerPers, baseEmp, baseOther, d, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).not.toContain('arbeitszimmer')
    })

    it('does NOT suggest arbeitszimmer to a regular employee', () => {
        const d = { ...baseDeductions, homeOfficeDays: 100 }
        const result = computeOpportunities(basePers, baseEmp, baseOther, d, baseSpe, null, p)
        const ids = result.opportunities.map((o) => o.id)
        expect(ids).not.toContain('arbeitszimmer')
    })
})
