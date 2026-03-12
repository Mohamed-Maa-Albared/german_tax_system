/**
 * Client-side tax calculation engine — mirrors the Python backend exactly.
 * Runs instantly without an API call, giving users real-time feedback.
 * Uses the same §32a EStG formulas.
 */
import type {
    DeductionsData,
    EmploymentData,
    OtherIncomeData,
    PersonalData,
    SpecialExpensesData,
    TaxCalculationResult,
    TaxYearParameters,
} from '../types/tax'

// ── Hard-coded 2026 fallback parameters (used if API is unavailable) ──────────
export const DEFAULT_PARAMS_2026: TaxYearParameters = {
    year: 2026,
    grundfreibetrag: 12_348,
    zone2_limit: 17_799,
    zone3_limit: 69_878,
    zone4_limit: 277_825,
    zone2_coeff1: 914.51,
    zone2_coeff2: 1_400,
    zone3_coeff1: 173.10,
    zone3_coeff2: 2_397,
    zone3_offset: 1_034.87,
    zone4_rate: 0.42,
    zone4_offset: 11_135.63,
    zone5_rate: 0.45,
    zone5_offset: 19_470.38,
    kinderfreibetrag: 9_756,
    werbungskosten_pauschale: 1_230,
    sonderausgaben_pauschale_single: 36,
    sonderausgaben_pauschale_joint: 72,
    sparer_pauschbetrag: 1_000,
    pendlerpauschale_per_km: 0.38,
    homeoffice_per_day: 6,
    homeoffice_max_days: 210,
    kindergeld_per_month: 259,
    soli_rate: 0.055,
    soli_freigrenze_single: 20_350,
    soli_freigrenze_joint: 40_700,
    kirchensteuer_rate_high: 0.09,
    kirchensteuer_rate_low: 0.08,
    max_pension_deduction_single: 30_826,
    max_pension_deduction_joint: 61_652,
    alimony_max: 13_805,
    ehrenamt_allowance: 960,
    uebungsleiter_allowance: 3_300,
    childcare_rate: 0.80,
    childcare_max_per_child: 4_800,
    is_active: true,
}

// ── §32a EStG tariff ──────────────────────────────────────────────────────────
function calculateTariff(zve: number, p: TaxYearParameters): number {
    const x = Math.floor(zve)
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
    return calculateTariff(zve / 2, p) * 2
}

function calculateSoli(tax: number, p: TaxYearParameters, isJoint: boolean): number {
    const freigrenze = isJoint ? p.soli_freigrenze_joint : p.soli_freigrenze_single
    if (tax <= freigrenze) return 0
    const fullSoli = p.soli_rate * tax
    const milderungSoli = 0.20 * (tax - freigrenze)
    return Math.floor(Math.min(fullSoli, milderungSoli))
}

function calculateKirchensteuer(tax: number, p: TaxYearParameters, isMember: boolean, rateType: 'high' | 'low'): number {
    if (!isMember) return 0
    const rate = rateType === 'low' ? p.kirchensteuer_rate_low : p.kirchensteuer_rate_high
    return Math.floor(tax * rate)
}

// ── Main full calculation ─────────────────────────────────────────────────────
export function calculateTax(
    personal: PersonalData,
    employment: EmploymentData,
    otherIncome: OtherIncomeData,
    deductions: DeductionsData,
    specialExpenses: SpecialExpensesData,
    params: TaxYearParameters
): TaxCalculationResult {
    const isJoint = personal.isMarried
    const tariffFn = isJoint
        ? (z: number) => calculateJointTariff(z, params)
        : (z: number) => calculateTariff(z, params)

    // ── 1. Werbungskosten ───────────────────────────────────────────────────────
    const pendler = deductions.commuteKm * params.pendlerpauschale_per_km * deductions.commuteDays
    const homeOffice = Math.min(deductions.homeOfficeDays, params.homeoffice_max_days) * params.homeoffice_per_day
    const wkActual = pendler + homeOffice + deductions.workEquipment + deductions.workTraining + deductions.otherWorkExpenses + deductions.unionFees
    const wkUsed = Math.max(wkActual, params.werbungskosten_pauschale)
    const employmentNet = Math.max(0, employment.grossSalary - wkUsed)

    // ── 2. Other income ─────────────────────────────────────────────────────────
    const selfEmployedNet = Math.max(0, otherIncome.selfEmployedRevenue - otherIncome.selfEmployedExpenses)
    const rentalNet = otherIncome.rentalIncome - otherIncome.rentalExpenses

    // ── 3. Gesamtbetrag ─────────────────────────────────────────────────────────
    const gesamtbetrag = employmentNet + selfEmployedNet + rentalNet

    // ── 4. Sonderausgaben ───────────────────────────────────────────────────────
    const insurance = specialExpenses.healthInsurance + specialExpenses.longTermCareInsurance
    const pensionMax = isJoint ? params.max_pension_deduction_joint : params.max_pension_deduction_single
    const pension = Math.min(specialExpenses.pensionContributions + specialExpenses.riesterContributions, pensionMax)
    const donations = Math.min(specialExpenses.donations, 0.20 * gesamtbetrag)
    const childcare = Math.min(specialExpenses.childcareCosts * params.childcare_rate, specialExpenses.childcareCosts)
    const alimony = Math.min(specialExpenses.alimonyPaid, params.alimony_max)
    const saActual = insurance + pension + donations + childcare + alimony + specialExpenses.churchFeesPaid
    const saPauschale = isJoint ? params.sonderausgaben_pauschale_joint : params.sonderausgaben_pauschale_single
    const saUsed = Math.max(saActual, saPauschale)

    // ── 5. Außergewöhnliche Belastungen ─────────────────────────────────────────
    let ablPct = gesamtbetrag <= 15_340 ? 0.05 : gesamtbetrag <= 51_130 ? 0.06 : 0.07
    if (personal.numChildren === 1 || personal.numChildren === 2) ablPct -= 0.01
    else if (personal.numChildren >= 3) ablPct -= 0.02
    if (isJoint) ablPct = Math.max(ablPct - 0.01, 0.01)
    const ablThreshold = gesamtbetrag * ablPct
    const abl = Math.max(0, specialExpenses.medicalCosts - ablThreshold)

    // ── 6. zvE before Kinderfreibetrag ──────────────────────────────────────────
    const zveBeforeKind = Math.max(0, gesamtbetrag - saUsed - abl)

    // ── 7. Günstigerprüfung (Kind) ──────────────────────────────────────────────
    let kindFreibetrag = 0
    let kindergeldAnnual = 0
    let tariflicheESt: number

    if (personal.numChildren > 0) {
        const kindFreibetragTotal = personal.numChildren * params.kinderfreibetrag
        kindergeldAnnual = personal.numChildren * params.kindergeld_per_month * 12
        const taxWithout = tariffFn(zveBeforeKind)
        const taxWith = tariffFn(Math.max(0, zveBeforeKind - kindFreibetragTotal))
        const taxSaving = taxWithout - taxWith
        if (taxSaving > kindergeldAnnual) {
            kindFreibetrag = kindFreibetragTotal
            tariflicheESt = taxWith
        } else {
            tariflicheESt = taxWithout
        }
    } else {
        tariflicheESt = tariffFn(zveBeforeKind)
    }

    const zve = Math.max(0, zveBeforeKind - kindFreibetrag)

    // ── 8. Soli + Kirchensteuer ─────────────────────────────────────────────────
    const soli = calculateSoli(tariflicheESt, params, isJoint)
    const kist = calculateKirchensteuer(tariflicheESt, params, personal.isChurchMember, personal.churchTaxRateType)

    // ── 9. Capital income (flat 25%) ────────────────────────────────────────────
    const investTaxable = Math.max(0, otherIncome.investmentIncome - params.sparer_pauschbetrag)
    const investFlatTax = Math.floor(investTaxable * 0.25)
    const investSoli = Math.floor(investFlatTax * 0.055)
    const capitalTaxTotal = investFlatTax + investSoli
    const capitalTaxDue = Math.max(0, capitalTaxTotal - otherIncome.investmentTaxWithheld)

    // ── 10. Total tax & withheld ────────────────────────────────────────────────
    const totalTax = tariflicheESt + soli + kist + capitalTaxDue
    const totalWithheld = employment.lohnsteuerWithheld + employment.soliWithheld + employment.kirchensteuerWithheld + otherIncome.investmentTaxWithheld

    // ── 11. Bottom line ─────────────────────────────────────────────────────────
    const kindergeldOffset = kindFreibetrag > 0 ? kindergeldAnnual : 0
    const refundOrPayment = totalWithheld - totalTax - kindergeldOffset

    // ── 12. Effective rate ──────────────────────────────────────────────────────
    const totalGross = employment.grossSalary + selfEmployedNet + rentalNet
    const effectiveRate = totalGross > 0 ? Math.round(tariflicheESt / totalGross * 1000) / 10 : 0
    const marginalRate = getMarginalRate(zve, params)

    return {
        employment_gross: employment.grossSalary,
        self_employed_net: selfEmployedNet,
        investment_income: otherIncome.investmentIncome,
        rental_net: rentalNet,
        gesamtbetrag_der_einkuenfte: gesamtbetrag,
        werbungskosten_actual: wkActual,
        werbungskosten_pauschale: params.werbungskosten_pauschale,
        werbungskosten_used: wkUsed,
        sonderausgaben_actual: saActual,
        sonderausgaben_pauschale: saPauschale,
        sonderausgaben_used: saUsed,
        aussergewoehnliche_belastungen: abl,
        kinderfreibetrag_used: kindFreibetrag,
        kindergeld_annual: kindergeldAnnual,
        zve,
        tarifliche_est: tariflicheESt,
        solidaritaetszuschlag: soli,
        kirchensteuer: kist,
        total_tax: totalTax,
        capital_tax_flat: capitalTaxDue,
        sparer_pauschbetrag_used: Math.min(otherIncome.investmentIncome, params.sparer_pauschbetrag),
        lohnsteuer_withheld: employment.lohnsteuerWithheld,
        soli_withheld: employment.soliWithheld,
        kirchensteuer_withheld: employment.kirchensteuerWithheld,
        capital_tax_withheld: otherIncome.investmentTaxWithheld,
        total_withheld: totalWithheld,
        refund_or_payment: refundOrPayment,
        effective_rate_percent: effectiveRate,
        marginal_rate_percent: marginalRate,
        suggestions: [],
        tax_year: personal.taxYear,
    }
}

function getMarginalRate(zve: number, p: TaxYearParameters): number {
    const x = Math.floor(zve)
    if (x <= p.grundfreibetrag) return 0
    if (x <= p.zone2_limit) {
        const y = (x - p.grundfreibetrag) / 10_000
        return Math.round((2 * p.zone2_coeff1 * y + p.zone2_coeff2) / 10_000 * 1000) / 10
    }
    if (x <= p.zone3_limit) {
        const z = (x - p.zone2_limit) / 10_000
        return Math.round((2 * p.zone3_coeff1 * z + p.zone3_coeff2) / 10_000 * 1000) / 10
    }
    if (x <= p.zone4_limit) return p.zone4_rate * 100
    return p.zone5_rate * 100
}
