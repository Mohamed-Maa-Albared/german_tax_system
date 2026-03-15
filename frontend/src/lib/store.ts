import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
    DeductionsData,
    EmploymentData,
    OtherIncomeData,
    PersonalData,
    SpecialExpensesData,
    TaxBreakdown,
    TaxYearParameters,
} from '../types/tax'
import { calculateTax, DEFAULT_PARAMS_2026 } from './taxCalculator'

interface TaxStore {
    currentStep: number
    personal: PersonalData
    employment: EmploymentData
    otherIncome: OtherIncomeData
    deductions: DeductionsData
    specialExpenses: SpecialExpensesData
    taxParams: TaxYearParameters
    result: TaxBreakdown | null
    resultsHistory: TaxBreakdown[]  // ordered oldest → newest

    setCurrentStep: (step: number) => void
    updatePersonal: (data: Partial<PersonalData>) => void
    updateEmployment: (data: Partial<EmploymentData>) => void
    updateOtherIncome: (data: Partial<OtherIncomeData>) => void
    updateDeductions: (data: Partial<DeductionsData>) => void
    updateSpecialExpenses: (data: Partial<SpecialExpensesData>) => void
    setTaxParams: (params: TaxYearParameters) => void
    runCalculation: () => void
    reset: () => void
}

const defaultPersonal: PersonalData = {
    isMarried: false,
    numChildren: 0,
    isChurchMember: false,
    churchTaxRateType: 'high',
    taxYear: 2026,
    federalState: 'BY',
    isFullYearResident: true,
    isDisabled: false,
    disabilityGrade: 0,
}

const defaultEmployment: EmploymentData = {
    grossSalary: 0,
    taxesWithheld: 0,
    soliWithheld: 0,
    kirchensteuerWithheld: 0,
    bonus: 0,
    bonusType: 'fixed',
    bonusPercent: 0,
    hasSalaryChange: false,
    salaryPeriods: [],
}

const defaultOtherIncome: OtherIncomeData = {
    selfEmployedRevenue: 0,
    selfEmployedExpenses: 0,
    dividends: 0,
    capitalGains: 0,
    capitalTaxesWithheld: 0,
    rentalIncome: 0,
    rentalExpenses: 0,
    fundType: 'standard',
    vorabpauschale: 0,
}

const defaultDeductions: DeductionsData = {
    commuteKm: 0,
    commuteDays: 220,
    homeOfficeDays: 0,
    otherWorkExpenses: 0,
    workEquipment: 0,
    workTraining: 0,
    unionFees: 0,
    lossCarryForward: 0,
}

const defaultSpecialExpenses: SpecialExpensesData = {
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

export const useTaxStore = create<TaxStore>()(persist(
    (set, get) => ({
        currentStep: 0,
        personal: { ...defaultPersonal },
        employment: { ...defaultEmployment },
        otherIncome: { ...defaultOtherIncome },
        deductions: { ...defaultDeductions },
        specialExpenses: { ...defaultSpecialExpenses },
        taxParams: DEFAULT_PARAMS_2026,
        result: null,
        resultsHistory: [],

        setCurrentStep: (step) => set({ currentStep: step }),

        updatePersonal: (data) =>
            set((state) => ({ personal: { ...state.personal, ...data } })),

        updateEmployment: (data) =>
            set((state) => ({ employment: { ...state.employment, ...data } })),

        updateOtherIncome: (data) =>
            set((state) => ({ otherIncome: { ...state.otherIncome, ...data } })),

        updateDeductions: (data) =>
            set((state) => ({ deductions: { ...state.deductions, ...data } })),

        updateSpecialExpenses: (data) =>
            set((state) => ({ specialExpenses: { ...state.specialExpenses, ...data } })),

        setTaxParams: (params) => set({ taxParams: params }),

        runCalculation: () => {
            const { personal, employment, otherIncome, deductions, specialExpenses, taxParams, resultsHistory } = get()
            const result = calculateTax(personal, employment, otherIncome, deductions, specialExpenses, taxParams)
            // Keep at most 5 historical results for multi-year comparison
            const updatedHistory = [
                ...resultsHistory.filter((r) => r.tax_year !== result.tax_year),
                result,
            ].slice(-5)
            set({ result, resultsHistory: updatedHistory })
        },

        reset: () =>
            set({
                currentStep: 0,
                personal: { ...defaultPersonal },
                employment: { ...defaultEmployment },
                otherIncome: { ...defaultOtherIncome },
                deductions: { ...defaultDeductions },
                specialExpenses: { ...defaultSpecialExpenses },
                taxParams: DEFAULT_PARAMS_2026,
                result: null,
                resultsHistory: [],
            }),
    }),
    { name: 'smarttax-wizard' },
))
