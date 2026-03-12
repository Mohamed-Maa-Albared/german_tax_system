import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
    DeductionsData,
    EmploymentData,
    OtherIncomeData,
    PersonalData,
    SpecialExpensesData,
    TaxCalculationResult,
    TaxYearParameters,
} from '../types/tax'
import { calculateTax, DEFAULT_PARAMS_2026 } from './taxCalculator'

export const TOTAL_STEPS = 7

const defaultPersonal: PersonalData = {
    taxYear: 2026,
    isMarried: false,
    numChildren: 0,
    isChurchMember: false,
    churchTaxRateType: 'high',
    isFullYearResident: true,
    isDisabled: false,
    disabilityGrade: 0,
}
const defaultEmployment: EmploymentData = {
    hasEmployment: true,
    grossSalary: 0,
    lohnsteuerWithheld: 0,
    soliWithheld: 0,
    kirchensteuerWithheld: 0,
}
const defaultOtherIncome: OtherIncomeData = {
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
const defaultDeductions: DeductionsData = {
    commuteKm: 0,
    commuteDays: 0,
    homeOfficeDays: 0,
    workEquipment: 0,
    workTraining: 0,
    otherWorkExpenses: 0,
    unionFees: 0,
}
const defaultSpecialExpenses: SpecialExpensesData = {
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

interface WizardStore {
    currentStep: number
    completedSteps: Set<number>
    personal: PersonalData
    employment: EmploymentData
    otherIncome: OtherIncomeData
    deductions: DeductionsData
    specialExpenses: SpecialExpensesData
    results: TaxCalculationResult | null
    taxParams: TaxYearParameters
    isCalculating: boolean

    // Actions
    setStep: (step: number) => void
    nextStep: () => void
    prevStep: () => void
    markStepComplete: (step: number) => void
    updatePersonal: (data: Partial<PersonalData>) => void
    updateEmployment: (data: Partial<EmploymentData>) => void
    updateOtherIncome: (data: Partial<OtherIncomeData>) => void
    updateDeductions: (data: Partial<DeductionsData>) => void
    updateSpecialExpenses: (data: Partial<SpecialExpensesData>) => void
    setTaxParams: (params: TaxYearParameters) => void
    runCalculation: () => void
    reset: () => void
}

export const useWizardStore = create<WizardStore>()(
    persist(
        (set, get) => ({
            currentStep: 0,
            completedSteps: new Set<number>(),
            personal: defaultPersonal,
            employment: defaultEmployment,
            otherIncome: defaultOtherIncome,
            deductions: defaultDeductions,
            specialExpenses: defaultSpecialExpenses,
            results: null,
            taxParams: DEFAULT_PARAMS_2026,
            isCalculating: false,

            setStep: (step) => set({ currentStep: step }),
            nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, TOTAL_STEPS - 1) })),
            prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),
            markStepComplete: (step) =>
                set((s) => ({ completedSteps: new Set([...s.completedSteps, step]) })),

            updatePersonal: (data) => set((s) => ({ personal: { ...s.personal, ...data } })),
            updateEmployment: (data) => set((s) => ({ employment: { ...s.employment, ...data } })),
            updateOtherIncome: (data) => set((s) => ({ otherIncome: { ...s.otherIncome, ...data } })),
            updateDeductions: (data) => set((s) => ({ deductions: { ...s.deductions, ...data } })),
            updateSpecialExpenses: (data) =>
                set((s) => ({ specialExpenses: { ...s.specialExpenses, ...data } })),
            setTaxParams: (params) => set({ taxParams: params }),

            runCalculation: () => {
                const s = get()
                set({ isCalculating: true })
                try {
                    const result = calculateTax(
                        s.personal,
                        s.employment,
                        s.otherIncome,
                        s.deductions,
                        s.specialExpenses,
                        s.taxParams
                    )
                    set({ results: result, isCalculating: false })
                } catch {
                    set({ isCalculating: false })
                }
            },

            reset: () =>
                set({
                    currentStep: 0,
                    completedSteps: new Set(),
                    personal: defaultPersonal,
                    employment: defaultEmployment,
                    otherIncome: defaultOtherIncome,
                    deductions: defaultDeductions,
                    specialExpenses: defaultSpecialExpenses,
                    results: null,
                }),
        }),
        {
            name: 'smarttax-wizard',
            // Only persist the state, not functions
            partialize: (s) => ({
                currentStep: s.currentStep,
                completedSteps: [...s.completedSteps],
                personal: s.personal,
                employment: s.employment,
                otherIncome: s.otherIncome,
                deductions: s.deductions,
                specialExpenses: s.specialExpenses,
                results: s.results,
                taxParams: s.taxParams,
            }),
            // Rehydrate Set from array
            onRehydrateStorage: () => (state) => {
                if (state && Array.isArray(state.completedSteps)) {
                    state.completedSteps = new Set(state.completedSteps as unknown as number[])
                }
            },
        }
    )
)
