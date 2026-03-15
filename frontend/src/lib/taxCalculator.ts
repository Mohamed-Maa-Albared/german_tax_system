/**
 * Client-side tax calculation engine — mirrors the Python backend exactly.
 * Runs instantly without an API call, giving users real-time feedback.
 * Based on §32a EStG 2026 formulas (Steuerfortentwicklungsgesetz 2024).
 */
import {
    DeductionsData,
    EmploymentData,
    OtherIncomeData,
    PersonalData,
    SpecialExpensesData,
    TaxBreakdown,
    TaxYearParameters,
} from '../types/tax'

export const DEFAULT_PARAMS_2026: TaxYearParameters = {
    id: 1,
    year: 2026,
    is_active: true,
    grundfreibetrag: 12_348,
    zone2_limit: 17_799,
    zone3_limit: 69_878,
    zone4_limit: 277_825,
    zone2_coeff1: 914.51,
    zone2_coeff2: 1_400.0,
    zone3_coeff1: 173.10,
    zone3_coeff2: 2_397.0,
    zone3_offset: 1_034.87,
    zone4_rate: 0.42,
    zone4_offset: 11_135.63,
    zone5_rate: 0.45,
    zone5_offset: 19_470.38,
    soli_rate: 0.055,
    soli_freigrenze_single: 20_350,
    soli_freigrenze_joint: 40_700,
    werbungskosten_pauschale: 1_230,
    sonderausgaben_pauschale_single: 36,
    sonderausgaben_pauschale_joint: 72,
    sparer_pauschbetrag: 1_000,
    pendlerpauschale_per_km: 0.38,
    homeoffice_per_day: 6.0,
    homeoffice_max_days: 210,
    kinderfreibetrag: 9_756,
    kindergeld_per_month: 259,
    kirchensteuer_rate_high: 0.09,
    kirchensteuer_rate_low: 0.08,
    max_pension_deduction_single: 30_826,
    max_pension_deduction_joint: 61_652,
    alimony_max: 13_805,
    ehrenamt_allowance: 960,
    uebungsleiter_allowance: 3_300,
    childcare_rate: 0.80,
    childcare_max_per_child: 4_800,
}

// ---------------------------------------------------------------------------
// Core §32a EStG tariff functions
// ---------------------------------------------------------------------------

function calculateTariff(zve: number, p: TaxYearParameters): number {
    const x = Math.floor(zve)  // §32a requires integer truncation
    if (x <= p.grundfreibetrag) return 0

    if (x <= p.zone2_limit) {
        const y = (x - p.grundfreibetrag) / 10_000
        return Math.floor((p.zone2_coeff1 * y + p.zone2_coeff2) * y)
    }

    if (x <= p.zone3_limit) {
        const z = (x - p.zone2_limit) / 10_000
        return Math.floor((p.zone3_coeff1 * z + p.zone3_coeff2) * z + p.zone3_offset)
    }

    if (x <= p.zone4_limit) {
        return Math.floor(p.zone4_rate * x - p.zone4_offset)
    }

    return Math.floor(p.zone5_rate * x - p.zone5_offset)
}

function calculateJointTariff(zve: number, p: TaxYearParameters): number {
    return 2 * calculateTariff(Math.floor(zve / 2), p)
}

function calculateSoli(tax: number, p: TaxYearParameters, isJoint: boolean): number {
    const freigrenze = isJoint ? p.soli_freigrenze_joint : p.soli_freigrenze_single
    if (tax <= freigrenze) return 0
    const full = Math.floor(tax * p.soli_rate)
    const mild = Math.floor((tax - freigrenze) * 0.20)
    return Math.min(full, mild) === full ? full : mild
}

function calculateKirchensteuer(
    tax: number,
    p: TaxYearParameters,
    isMember: boolean,
    rateType: 'high' | 'low',
): number {
    if (!isMember) return 0
    const rate = rateType === 'high' ? p.kirchensteuer_rate_high : p.kirchensteuer_rate_low
    return Math.floor(tax * rate)
}

/**
 * Calculate total Werbungskosten (§9 EStG).
 * 2026 §9a EStG rule: Gewerkschaftsbeiträge (union fees) are deductible
 * ADDITIONALLY to the Werbungskosten-Pauschale — never eaten by the Pauschale.
 */
function calcWerbungskosten(d: DeductionsData, p: TaxYearParameters): number {
    const commute = d.commuteKm * d.commuteDays * p.pendlerpauschale_per_km
    const days = Math.min(d.homeOfficeDays, p.homeoffice_max_days)
    const homeOffice = days * p.homeoffice_per_day
    // Base deductions (compared against Pauschale)
    const baseActual = commute + homeOffice + d.otherWorkExpenses + (d.workEquipment ?? 0) + (d.workTraining ?? 0)
    const wkBase = Math.max(baseActual, p.werbungskosten_pauschale)
    // Union fees always added on top of the Pauschale floor
    return wkBase + (d.unionFees ?? 0)
}

function calcSonderausgaben(
    s: SpecialExpensesData,
    p: TaxYearParameters,
    isJoint: boolean,
    gesamtbetrag: number,
): number {
    const maxPension = isJoint ? p.max_pension_deduction_joint : p.max_pension_deduction_single
    // Health + long-term care insurance: deductible up to pension cap
    const insurance = Math.min(
        s.healthInsuranceContributions + (s.longTermCareInsurance ?? 0),
        maxPension,
    )
    // Pension contributions: remaining capacity after insurance
    const pension = Math.min(s.pensionContributions, Math.max(0, maxPension - insurance))
    // Riester: capped at €2,100/person
    const riesterCap = isJoint ? 4_200 : 2_100
    const riester = Math.min(s.riesterContributions, riesterCap)
    const donationCap = gesamtbetrag * 0.20
    const donations = Math.min(s.donations, donationCap)
    return (
        insurance
        + pension
        + riester
        + donations
        + Math.min(s.alimonyPaid, p.alimony_max)
        + s.churchTaxPriorYear
    )
}

function calcChildcare(s: SpecialExpensesData, p: TaxYearParameters, numChildren: number): number {
    if (numChildren === 0) return 0
    const perChild = Math.min(s.childcareCosts / numChildren, p.childcare_max_per_child)
    return perChild * numChildren * p.childcare_rate
}

function calcKinderfreibetragVsKindergeld(
    numChildren: number,
    p: TaxYearParameters,
    tariffFn: (zve: number) => number,
    zveBeforeKind: number,
): { freibetragUsed: number; kindergeldAnnual: number } {
    if (numChildren === 0) return { freibetragUsed: 0, kindergeldAnnual: 0 }
    const totalFreibetrag = numChildren * p.kinderfreibetrag
    const kindergeldAnnual = numChildren * 12 * p.kindergeld_per_month
    const taxWithFreibetrag = tariffFn(Math.max(0, zveBeforeKind - totalFreibetrag))
    const taxWithout = tariffFn(zveBeforeKind)
    const taxSaving = taxWithout - taxWithFreibetrag
    if (taxSaving > kindergeldAnnual) {
        return { freibetragUsed: totalFreibetrag, kindergeldAnnual }
    }
    return { freibetragUsed: 0, kindergeldAnnual }
}

// ---------------------------------------------------------------------------
// §33b EStG — Disability flat-rate allowance (Behinderten-Pauschbetrag)
// ---------------------------------------------------------------------------

// Amounts in force since 1 Jan 2021 — keys are the lower bound of each GdB band
const DISABILITY_PAUSCHBETRAG: Record<number, number> = {
    20: 384,
    25: 620, 30: 620,
    35: 860, 40: 860,
    45: 1_140, 50: 1_140,
    55: 1_440, 60: 1_440,
    65: 1_780, 70: 1_780,
    75: 2_120, 80: 2_120,
    85: 2_460, 90: 2_460,
    95: 2_840, 100: 2_840,
}

function getDisabilityPauschbetrag(grade: number): number {
    if (grade < 20) return 0
    const keys = Object.keys(DISABILITY_PAUSCHBETRAG).map(Number).sort((a, b) => a - b)
    let amount = 0
    for (const key of keys) {
        if (key <= grade) amount = DISABILITY_PAUSCHBETRAG[key]
        else break
    }
    return amount
}

// ---------------------------------------------------------------------------
// §33 EStG — Außergewöhnliche Belastungen
// ---------------------------------------------------------------------------

function calcAussergewoehnlicheBelastungen(
    medicalCosts: number,
    gesamtbetrag: number,
    isJoint: boolean,
    numChildren: number,
): number {
    if (medicalCosts <= 0 || gesamtbetrag <= 0) return 0

    // Full §33 Abs.3 tiered table — income determines base percentage
    let basePct = gesamtbetrag <= 15_340 ? 0.05 : gesamtbetrag <= 51_130 ? 0.06 : 0.07
    // Child reduction (§33 Abs.3 Nr.1/2)
    if (numChildren === 1 || numChildren === 2) basePct -= 0.01
    else if (numChildren >= 3) basePct -= 0.02
    // Joint assessment reduction
    if (isJoint) basePct -= 0.01
    basePct = Math.max(basePct, 0.01)

    return Math.max(0, medicalCosts - gesamtbetrag * basePct)
}

// ---------------------------------------------------------------------------
// Main calculation entry point
// ---------------------------------------------------------------------------

export function calculateTax(
    personal: PersonalData,
    employment: EmploymentData,
    otherIncome: OtherIncomeData,
    deductions: DeductionsData,
    specialExpenses: SpecialExpensesData,
    params: TaxYearParameters,
): TaxBreakdown {
    const p = params
    const isJoint = personal.isMarried

    // 1. Gross income by category
    const selfEmployedNet = Math.max(0, otherIncome.selfEmployedRevenue - otherIncome.selfEmployedExpenses)
    const rentalNet = Math.max(0, otherIncome.rentalIncome - otherIncome.rentalExpenses)
    const grossIncome = employment.grossSalary + employment.bonus + selfEmployedNet + rentalNet

    // 2. Werbungskosten (2026: union fees on top of Pauschale — see calcWerbungskosten)
    const werbungskostenUsed = calcWerbungskosten(deductions, p)
    const actualWerbungskosten = werbungskostenUsed

    // 3. Gesamtbetrag der Einkünfte (progressive base)
    const gesamtbetrag = Math.max(0, grossIncome - werbungskostenUsed)

    // 4. Sonderausgaben (now includes long-term care insurance)
    const actualSonderausgaben = calcSonderausgaben(specialExpenses, p, isJoint, gesamtbetrag)
    const childcare = calcChildcare(specialExpenses, p, personal.numChildren)
    const saPauschale = isJoint
        ? p.sonderausgaben_pauschale_joint
        : p.sonderausgaben_pauschale_single
    const sonderausgabenUsed = Math.max(actualSonderausgaben + childcare, saPauschale)

    // 5. Außergewöhnliche Belastungen §33 EStG (full tiered table)
    const abl = calcAussergewoehnlicheBelastungen(
        specialExpenses.medicalCosts ?? 0,
        gesamtbetrag,
        isJoint,
        personal.numChildren,
    )

    // 5a. §33b EStG — Disability Pauschbetrag
    const disabilityPb =
        personal.isDisabled && (personal.disabilityGrade ?? 0) >= 20
            ? getDisabilityPauschbetrag(personal.disabilityGrade ?? 0)
            : 0

    // 6. ZVE before Kinderfreibetrag — apply §10d loss carry-forward last
    const lossCarryForward = deductions.lossCarryForward || 0
    const zveBeforeKind = Math.max(
        0,
        Math.floor(gesamtbetrag - sonderausgabenUsed - abl - disabilityPb - lossCarryForward),
    )

    // 7. Tariff function
    const tariffFn = isJoint
        ? (v: number) => calculateJointTariff(v, p)
        : (v: number) => calculateTariff(v, p)

    // 8. Kinderfreibetrag vs Kindergeld (Günstigerprüfung)
    const { freibetragUsed, kindergeldAnnual } = calcKinderfreibetragVsKindergeld(
        personal.numChildren,
        p,
        tariffFn,
        zveBeforeKind,
    )

    const zveAfterKind = Math.max(0, zveBeforeKind - freibetragUsed)
    const tariflicheEst = tariffFn(zveAfterKind)

    // 9. Soli
    const soli = calculateSoli(tariflicheEst, p, isJoint)

    // 10. Kirchensteuer
    const kirchensteuer = calculateKirchensteuer(
        tariflicheEst,
        p,
        personal.isChurchMember,
        personal.churchTaxRateType,
    )

    // 11. Capital tax — flat 25% Abgeltungsteuer + 5.5% Soli
    // Apply Teilfreistellung (InvStG 2018) based on fund type
    const TEILFREISTELLUNG_RATES: Record<string, number> = {
        equity_etf: 0.30,
        mixed_fund: 0.15,
        real_estate_fund: 0.60,
        bond_fund: 0.0,
        standard: 0.0,
    }
    const tfRate = TEILFREISTELLUNG_RATES[otherIncome.fundType ?? 'standard'] ?? 0.0
    const grossCapital = otherIncome.dividends + otherIncome.capitalGains
    const teilfreistellungExempt = Math.round(grossCapital * tfRate * 100) / 100
    const effectiveCapital = grossCapital - teilfreistellungExempt
    const taxableCapital = Math.max(0, effectiveCapital - p.sparer_pauschbetrag)
    const capitalTaxFlat = Math.floor(taxableCapital * 0.25 * 1.055)
    const capitalTaxDue = Math.max(0, capitalTaxFlat - otherIncome.capitalTaxesWithheld)

    // 12. Totals
    const totalTax = tariflicheEst + soli + kirchensteuer + capitalTaxDue
    const totalWithheld =
        (employment.taxesWithheld || 0) +
        (employment.soliWithheld || 0) +
        (employment.kirchensteuerWithheld || 0) +
        (otherIncome.capitalTaxesWithheld || 0)
    // Refund: positive = you get money back, negative = you owe
    const kindergeldOffset = freibetragUsed > 0 ? kindergeldAnnual : 0
    const refundOrPayment = totalWithheld - (tariflicheEst + soli + kirchensteuer) - kindergeldOffset

    // 13. Rates (0–1 decimal scale, as expected by tests)
    const effectiveRate = grossIncome > 0 ? (tariflicheEst + soli) / grossIncome : 0
    const marginalRate = _marginalRate(zveAfterKind, p, isJoint)

    return {
        tax_year: personal.taxYear,
        // Income breakdown
        gross_income: grossIncome,
        employment_gross: employment.grossSalary + employment.bonus,
        self_employed_net: selfEmployedNet,
        investment_income: otherIncome.dividends + otherIncome.capitalGains,
        rental_net: rentalNet,
        gesamtbetrag_der_einkuenfte: gesamtbetrag,
        // Deductions
        werbungskosten_actual: actualWerbungskosten,
        werbungskosten_pauschale: p.werbungskosten_pauschale,
        werbungskosten_used: werbungskostenUsed,
        sonderausgaben_actual: actualSonderausgaben,
        sonderausgaben_pauschale: saPauschale,
        sonderausgaben_used: sonderausgabenUsed,
        aussergewoehnliche_belastungen: abl,
        disability_pauschbetrag_used: disabilityPb,
        // Core result
        zve: zveAfterKind,
        tarifliche_est: tariflicheEst,
        solidaritaetszuschlag: soli,
        kirchensteuer,
        kinderfreibetrag_used: freibetragUsed,
        kindergeld_annual: kindergeldAnnual,
        capital_tax_flat: capitalTaxFlat,
        capital_tax_due: capitalTaxDue,
        sparer_pauschbetrag_used: Math.min(effectiveCapital, p.sparer_pauschbetrag),
        teilfreistellung_applied: teilfreistellungExempt,
        total_tax: totalTax,
        // Withheld
        lohnsteuer_withheld: employment.taxesWithheld,
        soli_withheld: employment.soliWithheld ?? 0,
        kirchensteuer_withheld: employment.kirchensteuerWithheld ?? 0,
        capital_tax_withheld: otherIncome.capitalTaxesWithheld,
        total_withheld: totalWithheld,
        // Bottom line
        refund_or_payment: refundOrPayment,
        effective_rate: effectiveRate,
        marginal_rate: marginalRate,
        suggestions: [],
    }
}

function _marginalRate(
    zve: number,
    p: TaxYearParameters,
    isJoint: boolean,
): number {
    const delta = 100
    const tariffFn = isJoint
        ? (v: number) => calculateJointTariff(v, p)
        : (v: number) => calculateTariff(v, p)
    return (tariffFn(zve + delta) - tariffFn(zve)) / delta
}
