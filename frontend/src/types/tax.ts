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
    occupationType?: 'employee' | 'teacher_civil_servant' | 'freelancer'
}

export interface EmploymentData {
    grossSalary: number
    taxesWithheld: number
    soliWithheld?: number        // Soli Zeile 5 on Lohnsteuerbescheinigung
    kirchensteuerWithheld?: number  // KiSt Zeile 6+7 on Lohnsteuerbescheinigung
    bonus: number             // resolved euro amount always used for calculation
    bonusType?: 'fixed' | 'percent'  // UI preference — fixed € or % of gross salary
    bonusPercent?: number    // percentage value when bonusType === 'percent'
    // Salary-change support: if hasSalaryChange is true, periods override grossSalary
    hasSalaryChange?: boolean
    salaryPeriods?: SalaryPeriod[]
}

export interface SalaryPeriod {
    months: number      // number of months at this salary (1–12)
    monthlyGross: number  // gross monthly salary for this period
}

export interface OtherIncomeData {
    selfEmployedRevenue: number
    selfEmployedExpenses: number
    dividends: number
    capitalGains: number
    capitalTaxesWithheld: number
    rentalIncome: number
    rentalExpenses: number
    // ETF / fund type — drives Teilfreistellung (InvStG 2018)
    fundType?: 'standard' | 'equity_etf' | 'mixed_fund' | 'real_estate_fund' | 'bond_fund'
    vorabpauschale?: number  // §18 InvStG advance lump-sum already withheld by broker
}

export interface DeductionsData {
    commuteKm: number
    commuteDays: number
    homeOfficeDays: number
    otherWorkExpenses: number
    workEquipment?: number   // desk, laptop, chair — fully deductible (GWG ≤€952)
    workTraining?: number    // courses, books, professional education
    unionFees?: number       // Gewerkschaftsbeiträge
    lossCarryForward?: number  // §10d EStG — Verlustvortrag from prior years
    // Häusliches Arbeitszimmer (§4 Abs.5 Nr.6b / §9 Abs.5 EStG)
    homeOfficeType?: 'pauschale' | 'arbeitszimmer'
    arbeitszimmerMittelpunkt?: boolean   // is home the Mittelpunkt of all professional activity?
    apartmentSqm?: number                // total apartment floor area in m²
    officeSqm?: number                   // dedicated office room floor area in m²
    monthlyWarmRent?: number             // total monthly warm rent (€)
    yourRentSharePct?: number            // your % share of rent (0–100; 100 if you pay alone)
    arbeitszimmerStartMonth?: number     // month room was first used for work (1=Jan … 12=Dec); prorates the deduction
    // Teacher / civil-servant specific
    teacherMaterials?: number            // Unterrichtsmaterialien: books, worksheets, etc.
    doubleHouseholdCostsPerMonth?: number  // Doppelte Haushaltsführung monthly costs (€1,000/month cap)
    doubleHouseholdMonths?: number         // number of months maintained
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
    teilfreistellung_applied?: number  // InvStG exempt amount (equity ETF 30%, mixed 15%, etc.)
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
