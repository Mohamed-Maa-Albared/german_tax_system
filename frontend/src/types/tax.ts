// ─────────────────────────────────────────────────────────────────────────────
//  Wizard State Sections
// ─────────────────────────────────────────────────────────────────────────────
export interface PersonalData {
    isMarried: boolean
    numChildren: number
    isChurchMember: boolean
    churchTaxRateType: 'high' | 'low'  // high = 9% (most states), low = 8% (Bavaria/BW)
    taxYear: number
    federalState?: string
    isFullYearResident?: boolean
    isDisabled?: boolean
    disabilityGrade?: number            // 0 = none, 25–30–50–60–70–80–90–100 = Grad der Behinderung
}

export interface EmploymentData {
    grossSalary: number
    taxesWithheld: number
    bonus: number             // resolved euro amount always used for calculation
    bonusType?: 'fixed' | 'percent'  // UI preference — fixed € or % of gross salary
    bonusPercent?: number    // percentage value when bonusType === 'percent'
}

export interface OtherIncomeData {
    selfEmployedRevenue: number
    selfEmployedExpenses: number
    dividends: number
    capitalGains: number
    capitalTaxesWithheld: number
    rentalIncome: number
    rentalExpenses: number
}

export interface DeductionsData {
    commuteKm: number
    commuteDays: number
    homeOfficeDays: number
    otherWorkExpenses: number
    workEquipment?: number   // desk, laptop, chair — fully deductible (GWG ≤€952)
    workTraining?: number    // courses, books, professional education
    unionFees?: number       // Gewerkschaftsbeiträge
}

export interface SpecialExpensesData {
    pensionContributions: number
    healthInsuranceContributions: number  // GKV/PKV premiums (§10 Abs.1 Nr.3 EStG)
    longTermCareInsurance?: number        // Pflegeversicherung
    riesterContributions: number
    donations: number
    alimonyPaid: number
    churchTaxPriorYear: number
    childcareCosts: number
    medicalCosts?: number                 // Außergewöhnliche Belastungen (§33 EStG)
}

/** Matches the API snake_case response */
export interface TaxYearParameters {
    id: number
    year: number
    is_active: boolean
    grundfreibetrag: number
    zone2_limit: number
    zone3_limit: number
    zone4_limit: number
    zone2_coeff1: number
    zone2_coeff2: number
    zone3_coeff1: number
    zone3_coeff2: number
    zone3_offset: number
    zone4_rate: number
    zone4_offset: number
    zone5_rate: number
    zone5_offset: number
    soli_rate: number
    soli_freigrenze_single: number
    soli_freigrenze_joint: number
    werbungskosten_pauschale: number
    sonderausgaben_pauschale_single: number
    sonderausgaben_pauschale_joint: number
    sparer_pauschbetrag: number
    pendlerpauschale_per_km: number
    homeoffice_per_day: number
    homeoffice_max_days: number
    kinderfreibetrag: number
    kindergeld_per_month: number
    kirchensteuer_rate_high: number
    kirchensteuer_rate_low: number
    max_pension_deduction_single: number
    max_pension_deduction_joint: number
    alimony_max: number
    ehrenamt_allowance: number
    uebungsleiter_allowance: number
    childcare_rate: number
    childcare_max_per_child: number
    notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Local calculation result (returned by taxCalculator.ts)
// ─────────────────────────────────────────────────────────────────────────────
export interface TaxBreakdown {
    tax_year: number

    // Income breakdown
    gross_income: number
    employment_gross?: number
    self_employed_net?: number
    investment_income?: number
    rental_net?: number
    gesamtbetrag_der_einkuenfte?: number

    // Deductions applied
    werbungskosten_actual?: number
    werbungskosten_pauschale?: number
    werbungskosten_used: number
    sonderausgaben_actual?: number
    sonderausgaben_pauschale?: number
    sonderausgaben_used: number
    aussergewoehnliche_belastungen?: number  // renamed from aussergewoehnliche_belast
    disability_pauschbetrag_used?: number     // §33b EStG flat-rate disability allowance

    // Core tax result
    zve: number
    tarifliche_est: number
    solidaritaetszuschlag: number
    kirchensteuer: number
    kinderfreibetrag_used: number
    kindergeld_annual: number
    capital_tax_flat: number
    capital_tax_due: number
    sparer_pauschbetrag_used?: number
    total_tax: number

    // Withheld
    lohnsteuer_withheld?: number
    soli_withheld?: number
    kirchensteuer_withheld?: number
    capital_tax_withheld?: number
    total_withheld: number

    // Bottom line
    refund_or_payment: number

    // Rates  (0–1 decimal scale, NOT percent)
    effective_rate: number
    marginal_rate: number

    suggestions: string[]
}
