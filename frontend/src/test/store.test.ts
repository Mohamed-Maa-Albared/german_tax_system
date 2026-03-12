/**
 * Zustand store tests — covers state mutations and runCalculation
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useTaxStore } from '../lib/store'
import { DEFAULT_PARAMS_2026 } from '../lib/taxCalculator'

// Reset store between tests
beforeEach(() => {
    useTaxStore.getState().reset()
})

describe('useTaxStore — initial state', () => {
    it('starts at step 0', () => {
        expect(useTaxStore.getState().currentStep).toBe(0)
    })

    it('default grossSalary is 0', () => {
        expect(useTaxStore.getState().employment.grossSalary).toBe(0)
    })

    it('result is null initially', () => {
        expect(useTaxStore.getState().result).toBeNull()
    })

    it('taxParams defaults to 2026', () => {
        expect(useTaxStore.getState().taxParams.year).toBe(2026)
        expect(useTaxStore.getState().taxParams.grundfreibetrag).toBe(12348)
    })
})

describe('useTaxStore — step navigation', () => {
    it('setCurrentStep updates step', () => {
        useTaxStore.getState().setCurrentStep(3)
        expect(useTaxStore.getState().currentStep).toBe(3)
    })
})

describe('useTaxStore — updatePersonal', () => {
    it('updates isMarried', () => {
        useTaxStore.getState().updatePersonal({ isMarried: true })
        expect(useTaxStore.getState().personal.isMarried).toBe(true)
    })

    it('updates numChildren', () => {
        useTaxStore.getState().updatePersonal({ numChildren: 2 })
        expect(useTaxStore.getState().personal.numChildren).toBe(2)
    })

    it('partial update does not overwrite other fields', () => {
        useTaxStore.getState().updatePersonal({ isMarried: true })
        useTaxStore.getState().updatePersonal({ numChildren: 3 })
        const s = useTaxStore.getState().personal
        expect(s.isMarried).toBe(true)
        expect(s.numChildren).toBe(3)
    })
})

describe('useTaxStore — updateEmployment', () => {
    it('updates grossSalary', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 60000 })
        expect(useTaxStore.getState().employment.grossSalary).toBe(60000)
    })

    it('updates taxesWithheld', () => {
        useTaxStore.getState().updateEmployment({ taxesWithheld: 12000 })
        expect(useTaxStore.getState().employment.taxesWithheld).toBe(12000)
    })
})

describe('useTaxStore — setTaxParams', () => {
    it('replaces taxParams', () => {
        const custom = { ...DEFAULT_PARAMS_2026, grundfreibetrag: 99999 }
        useTaxStore.getState().setTaxParams(custom)
        expect(useTaxStore.getState().taxParams.grundfreibetrag).toBe(99999)
    })
})

describe('useTaxStore — runCalculation', () => {
    it('populates result after calculation', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 50000 })
        useTaxStore.getState().runCalculation()
        const result = useTaxStore.getState().result
        expect(result).not.toBeNull()
        expect(result!.tarifliche_est).toBeGreaterThan(0)
    })

    it('result contains all required fields', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 50000 })
        useTaxStore.getState().runCalculation()
        const r = useTaxStore.getState().result!
        expect(r).toHaveProperty('zve')
        expect(r).toHaveProperty('tarifliche_est')
        expect(r).toHaveProperty('total_tax')
        expect(r).toHaveProperty('effective_rate')
        expect(r).toHaveProperty('refund_or_payment')
        expect(r).toHaveProperty('suggestions')
    })

    it('refund_or_payment = withheld - taxes owed', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 50000, taxesWithheld: 5000 })
        useTaxStore.getState().runCalculation()
        const r = useTaxStore.getState().result!
        const expected = 5000 - (r.tarifliche_est + r.solidaritaetszuschlag + r.kirchensteuer)
        expect(r.refund_or_payment).toBeCloseTo(expected, -1)
    })

    it('married couple produces lower tariff than single at same income', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 150000 })
        useTaxStore.getState().runCalculation()
        const singleTax = useTaxStore.getState().result!.tarifliche_est

        useTaxStore.getState().updatePersonal({ isMarried: true })
        useTaxStore.getState().runCalculation()
        const marriedTax = useTaxStore.getState().result!.tarifliche_est

        expect(marriedTax).toBeLessThan(singleTax)
    })

    it('church member has higher total_tax than non-member', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 60000 })
        useTaxStore.getState().runCalculation()
        const nonMember = useTaxStore.getState().result!.total_tax

        useTaxStore.getState().updatePersonal({ isChurchMember: true })
        useTaxStore.getState().runCalculation()
        const member = useTaxStore.getState().result!.total_tax

        expect(member).toBeGreaterThan(nonMember)
    })
})

describe('useTaxStore — reset', () => {
    it('reset clears result', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 50000 })
        useTaxStore.getState().runCalculation()
        expect(useTaxStore.getState().result).not.toBeNull()

        useTaxStore.getState().reset()
        expect(useTaxStore.getState().result).toBeNull()
    })

    it('reset clears step', () => {
        useTaxStore.getState().setCurrentStep(3)
        useTaxStore.getState().reset()
        expect(useTaxStore.getState().currentStep).toBe(0)
    })

    it('reset restores grossSalary to 0', () => {
        useTaxStore.getState().updateEmployment({ grossSalary: 99000 })
        useTaxStore.getState().reset()
        expect(useTaxStore.getState().employment.grossSalary).toBe(0)
    })
})
