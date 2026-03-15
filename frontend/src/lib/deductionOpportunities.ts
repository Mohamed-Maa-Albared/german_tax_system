/**
 * Deterministic missed-deduction opportunity engine.
 *
 * Analyses the user's current Zustand store state and returns a ranked list of
 * deduction opportunities — potential savings with confidence levels and
 * the evidence/documents needed to claim each one.
 *
 * Runs entirely client-side with no API call: savings estimates are computed
 * from the user's own data and marginal tax rate.  The AI advisor uses these
 * as grounded context; the Results page uses them for the Deduction Score.
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
import { DEFAULT_PARAMS_2026 } from './taxCalculator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OpportunityConfidence = 'confirmed' | 'likely' | 'needs-input'

export interface DeductionOpportunity {
    id: string
    title: string                    // short English label
    lawRef: string                   // §-citation
    description: string              // plain-English what it is
    estimatedSavingMin: number       // lower bound €
    estimatedSavingMax: number       // upper bound €
    confidence: OpportunityConfidence
    /** Specific question the advisor should ask to unlock this deduction */
    advisorQuestion: string
    /** The wizard FIELD_APPLY key that can be updated once confirmed */
    applyField?: string
    /** Evidence/documents the user needs */
    documents: string[]
    /** If true, user has already entered a non-zero value (still show if below cap) */
    alreadyClaiming: boolean
    /** Whether this is at or near 100% of the legal cap */
    atCap: boolean
}

export interface OpportunitySummary {
    opportunities: DeductionOpportunity[]
    /** 0-100: ratio of claimed deductions vs max claimable given user's income */
    deductionScore: number
    /** Sum of min estimated savings across all un-claimed opportunities */
    totalPotentialSavingMin: number
    /** Sum of max estimated savings */
    totalPotentialSavingMax: number
    /** Estimated marginal tax rate (0–1) derived from ZVE */
    marginalRate: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMarginalRate(zve: number): number {
    if (zve <= 12_348) return 0
    if (zve <= 17_799) return 0.24
    if (zve <= 69_878) return 0.24 + 0.18 * ((zve - 17_800) / (69_878 - 17_800))
    if (zve <= 277_825) return 0.42
    return 0.45
}

function savingEst(amount: number, rate: number): number {
    return Math.round(amount * rate)
}

// ---------------------------------------------------------------------------
// Opportunity detectors
// (Each returns null if the opportunity does not apply to this user)
// ---------------------------------------------------------------------------

function detectHomeOffice(
    d: DeductionsData,
    p: TaxYearParameters,
    rate: number,
): DeductionOpportunity | null {
    const maxDays = p.homeoffice_max_days        // 210
    const perDay = p.homeoffice_per_day           // €6
    const current = d.homeOfficeDays
    const remaining = maxDays - current
    if (remaining <= 0) return null              // already at cap

    const unclaimed = remaining * perDay
    return {
        id: 'home_office_days',
        title: 'Home Office (Homeoffice-Pauschale)',
        lawRef: '§9 Abs.5 EStG / BMF 2024',
        description: 'You can claim €6 per day you worked from home, up to 210 days/year. No dedicated room needed — hybrid and occasional remote work qualifies.',
        estimatedSavingMin: savingEst(unclaimed * 0.25, rate),
        estimatedSavingMax: savingEst(unclaimed, rate),
        confidence: current === 0 ? 'needs-input' : 'likely',
        advisorQuestion: `How many days did you work from home in ${new Date().getFullYear() - 1}? You currently have ${current} days — the max is 210.`,
        applyField: 'home_office_days',
        documents: ['Any diary, Slack/calendar record, or employer confirmation of working-from-home days'],
        alreadyClaiming: current > 0,
        atCap: false,
    }
}

function detectHealthInsurance(
    s: SpecialExpensesData,
    grossIncome: number,
    rate: number,
): DeductionOpportunity | null {
    // Typical employee GKV contribution is ~7.3% of gross + 1–2% Zusatzbeitrag
    // For 0-entry we suggest they check; typical range €2,400–€4,500
    if (s.healthInsuranceContributions > 0) return null
    if (grossIncome <= 0) return null

    const typicalMin = Math.round(grossIncome * 0.073)
    const typicalMax = Math.round(grossIncome * 0.095)

    return {
        id: 'health_insurance_contributions',
        title: 'Statutory Health Insurance Contributions',
        lawRef: '§10 Abs.1 Nr.3 EStG',
        description: 'Your GKV/PKV employee share is fully deductible. This is typically the single largest Sonderausgaben item and is most commonly forgotten.',
        estimatedSavingMin: savingEst(typicalMin, rate),
        estimatedSavingMax: savingEst(typicalMax, rate),
        confidence: 'likely',
        advisorQuestion: 'What were your total GKV (public health insurance) or PKV (private) premium contributions for the year? Check your payslips — it\'s the "Krankenversicherung" line.',
        applyField: 'health_insurance_contributions',
        documents: ['Annual contributions statement from your health insurer (Beitragsbescheinigung)', 'Or: employee payslip showing monthly Krankenversicherung deduction × 12'],
        alreadyClaiming: false,
        atCap: false,
    }
}

function detectLongTermCare(
    s: SpecialExpensesData,
    grossIncome: number,
    rate: number,
): DeductionOpportunity | null {
    if ((s.longTermCareInsurance ?? 0) > 0) return null
    if (grossIncome <= 0) return null

    // Mandatory Pflegeversicherung is ~1.7–2.3% of gross (employer split)
    const typicalMin = Math.round(grossIncome * 0.009)
    const typicalMax = Math.round(grossIncome * 0.012)

    return {
        id: 'long_term_care_insurance',
        title: 'Long-Term Care Insurance (Pflegeversicherung)',
        lawRef: '§10 Abs.1 Nr.3a EStG',
        description: 'Statutory long-term care contributions are fully deductible. Usually €700–€1,200/year — shown on your payslip alongside Krankenversicherung.',
        estimatedSavingMin: savingEst(typicalMin, rate),
        estimatedSavingMax: savingEst(typicalMax, rate),
        confidence: 'likely',
        advisorQuestion: 'Your Pflegeversicherung contributions are currently at €0. Check your payslips — what is the "Pflegeversicherung" monthly amount?',
        applyField: 'long_term_care_insurance',
        documents: ['Payslip showing monthly Pflegeversicherung deductions', 'Or Lohnsteuerbescheinigung (Zeile 26)'],
        alreadyClaiming: false,
        atCap: false,
    }
}

function detectPension(
    s: SpecialExpensesData,
    p: TaxYearParameters,
    isJoint: boolean,
    rate: number,
): DeductionOpportunity | null {
    const cap = isJoint ? p.max_pension_deduction_joint : p.max_pension_deduction_single
    const current = s.pensionContributions
    const remaining = cap - current
    if (remaining <= 5_000) return null   // already near cap or over

    const typical = Math.min(remaining, 5_000) // suggest a conservative increase
    return {
        id: 'pension_contributions',
        title: 'Pension Contributions (Rürup / Altersvorsorge)',
        lawRef: '§10 Abs.1 Nr.2 EStG',
        description: `You can deduct up to ${isJoint ? '€61,652' : '€30,826'} in pension contributions. Rürup (Basis-Rente) is especially tax-efficient for higher earners.`,
        estimatedSavingMin: savingEst(typical * 0.5, rate),
        estimatedSavingMax: savingEst(typical, rate),
        confidence: current > 0 ? 'likely' : 'needs-input',
        advisorQuestion: 'Did you make any Rürup (Basisrente) or other pension contributions beyond the statutory GRV deduction? If yes, how much?',
        applyField: 'pension_contributions',
        documents: ['Annual contribution certificate from pension provider (Jahresbescheinigung)'],
        alreadyClaiming: current > 0,
        atCap: false,
    }
}

function detectRiester(
    s: SpecialExpensesData,
    p: TaxYearParameters,
    isJoint: boolean,
    rate: number,
): DeductionOpportunity | null {
    const cap = isJoint ? 4_200 : 2_100
    if (s.riesterContributions >= cap * 0.9) return null

    return {
        id: 'riester_contributions',
        title: 'Riester Pension Contributions',
        lawRef: '§10a EStG',
        description: `Riester contributions up to €${cap.toLocaleString()} are deductible. You also get state bonuses (Grundzulage €175/person + €300/child), which the tax office considers automatically.`,
        estimatedSavingMin: savingEst(Math.max(0, cap - s.riesterContributions) * 0.3, rate),
        estimatedSavingMax: savingEst(Math.max(0, cap - s.riesterContributions), rate),
        confidence: s.riesterContributions > 0 ? 'likely' : 'needs-input',
        advisorQuestion: 'Do you have a Riester contract? If yes, how much did you contribute in total this year (including bonuses)?',
        applyField: 'riester_contributions',
        documents: ['Riester contribution certificate from provider (Zertifizierungsnachweis)', 'Zahlungsbestätigung from your bank or provider'],
        alreadyClaiming: s.riesterContributions > 0,
        atCap: s.riesterContributions >= cap * 0.9,
    }
}

function detectWorkEquipment(
    d: DeductionsData,
    emp: EmploymentData,
    rate: number,
): DeductionOpportunity | null {
    if ((d.workEquipment ?? 0) >= 800) return null
    if (emp.grossSalary <= 0) return null

    return {
        id: 'work_equipment',
        title: 'Work Equipment (Arbeitsmittel / GWG)',
        lawRef: '§9 Abs.1 Nr.6 EStG',
        description: 'Items costing up to €800 net used for work (laptop, monitor, keyboard, desk chair, headset) are 100% deductible. Items costing more are depreciated over 3–5 years.',
        estimatedSavingMin: savingEst(100, rate),
        estimatedSavingMax: savingEst(1_500, rate),
        confidence: 'needs-input',
        advisorQuestion: 'Did you buy any equipment for work this year — laptop, monitor, desk, chair, headset, or tools? If yes, please tell me the total amount.',
        applyField: 'work_equipment',
        documents: ['Receipts or invoices for each item', 'Clear work-use reason (personal note or employer confirmation is fine)'],
        alreadyClaiming: (d.workEquipment ?? 0) > 0,
        atCap: false,
    }
}

function detectWorkTraining(
    d: DeductionsData,
    emp: EmploymentData,
    rate: number,
): DeductionOpportunity | null {
    if ((d.workTraining ?? 0) >= 500) return null
    if (emp.grossSalary <= 0) return null

    return {
        id: 'work_training',
        title: 'Work Training & Professional Books',
        lawRef: '§9 Abs.1 Nr.6 EStG',
        description: 'Courses, certifications, language classes (if work-related), professional books, and industry journal subscriptions are fully deductible with no cap.',
        estimatedSavingMin: savingEst(50, rate),
        estimatedSavingMax: savingEst(1_000, rate),
        confidence: 'needs-input',
        advisorQuestion: 'Did you spend anything on work-related courses, books, certifications, or subscriptions (LinkedIn Learning, Udemy, professional magazines)?',
        applyField: 'work_training',
        documents: ['Receipts / invoices', 'Proof that the content relates to your job (e.g. course syllabus)'],
        alreadyClaiming: (d.workTraining ?? 0) > 0,
        atCap: false,
    }
}

function detectUnionFees(
    d: DeductionsData,
    emp: EmploymentData,
    rate: number,
): DeductionOpportunity | null {
    if ((d.unionFees ?? 0) > 0) return null
    if (emp.grossSalary <= 0) return null

    return {
        id: 'union_fees',
        title: 'Union Fees (Gewerkschaftsbeiträge)',
        lawRef: '§9 Abs.1 Nr.3 EStG (2026: additive above Pauschale)',
        description: 'Union membership fees are deductible ADDITIONALLY on top of the €1,230 Werbungskosten-Pauschale — a 2026 rule change that makes these extra valuable.',
        estimatedSavingMin: savingEst(100, rate),
        estimatedSavingMax: savingEst(500, rate),
        confidence: 'needs-input',
        advisorQuestion: 'Are you a member of a German trade union (e.g. ver.di, IG Metall, GEW, IG BCE)? If yes, how much did you pay in membership fees this year?',
        applyField: 'union_fees',
        documents: ['Annual Beitragsnachweis from your union', 'Or bank statement showing regular union fee payments'],
        alreadyClaiming: false,
        atCap: false,
    }
}

function detectDonations(
    s: SpecialExpensesData,
    grossIncome: number,
    rate: number,
): DeductionOpportunity | null {
    if (s.donations >= grossIncome * 0.05) return null  // already claiming reasonable amount

    return {
        id: 'donations',
        title: 'Charitable Donations (Spenden)',
        lawRef: '§10b EStG',
        description: 'Donations to registered charities are deductible up to 20% of total income. Even small donations count. No receipt needed for amounts up to €300 — just a bank statement.',
        estimatedSavingMin: savingEst(50, rate),
        estimatedSavingMax: savingEst(1_000, rate),
        confidence: 'needs-input',
        advisorQuestion: 'Did you donate to any registered charities, NGOs, churches, or political parties this year? Total of all donations.',
        applyField: 'donations',
        documents: ['Zuwendungsbestätigung (donation receipt) for amounts >€300', 'Bank statement / Paypal confirmation for amounts ≤€300'],
        alreadyClaiming: s.donations > 0,
        atCap: s.donations >= grossIncome * 0.18,
    }
}

function detectChildcare(
    s: SpecialExpensesData,
    p: TaxYearParameters,
    numChildren: number,
    rate: number,
): DeductionOpportunity | null {
    if (numChildren === 0) return null
    const cap = numChildren * p.childcare_max_per_child
    if ((s.childcareCosts ?? 0) >= cap * 0.9) return null

    const unclaimed = cap - (s.childcareCosts ?? 0)
    return {
        id: 'childcare_costs',
        title: 'Childcare Costs (Kinderbetreuungskosten)',
        lawRef: '§10 Abs.1 Nr.5 EStG',
        description: `80% of childcare costs are deductible, up to €4,800 per child under 14 (${numChildren} child${numChildren > 1 ? 'ren' : ''} → max €${cap.toLocaleString()}). Covers Kita, Tagesmutter, Hort, and holiday camps.`,
        estimatedSavingMin: savingEst(unclaimed * p.childcare_rate * 0.3, rate),
        estimatedSavingMax: savingEst(unclaimed * p.childcare_rate, rate),
        confidence: (s.childcareCosts ?? 0) === 0 ? 'needs-input' : 'likely',
        advisorQuestion: `What did you pay in total for childcare in ${new Date().getFullYear() - 1}? Include Kita, Tagesmutter, Hort, and holiday camps. Current entry: €${s.childcareCosts ?? 0}.`,
        applyField: 'childcare_costs',
        documents: ['Rechnungen from Kita/Tagesmutter', 'Annual statement from childcare provider', 'Bank transfers matching the fees'],
        alreadyClaiming: (s.childcareCosts ?? 0) > 0,
        atCap: (s.childcareCosts ?? 0) >= cap * 0.9,
    }
}

function detectMedicalCosts(
    s: SpecialExpensesData,
    grossIncome: number,
    isJoint: boolean,
    numChildren: number,
    rate: number,
): DeductionOpportunity | null {
    // Compute zumutbare Belastung threshold to see if it's even worth asking
    let basePct = grossIncome <= 15_340 ? 0.05 : grossIncome <= 51_130 ? 0.06 : 0.07
    if (numChildren === 1 || numChildren === 2) basePct -= 0.01
    else if (numChildren >= 3) basePct -= 0.02
    if (isJoint) basePct -= 0.01
    basePct = Math.max(basePct, 0.01)
    const threshold = Math.round(grossIncome * basePct)

    if ((s.medicalCosts ?? 0) >= threshold * 0.9) return null  // already near or above threshold

    const potentialExcess = Math.max(0, (s.medicalCosts ?? 0) - threshold)
    return {
        id: 'medical_costs',
        title: 'Medical & Dental Costs (Außergewöhnliche Belastungen)',
        lawRef: '§33 EStG',
        description: `Out-of-pocket medical costs above ~€${threshold.toLocaleString()} (your "zumutbare Belastung") are deductible. Covers co-payments, dental work, glasses, prescribed medication, and physiotherapy.`,
        estimatedSavingMin: savingEst(Math.max(0, potentialExcess - threshold * 0.3), rate),
        estimatedSavingMax: savingEst(Math.max(0, (s.medicalCosts ?? 0) * 0.5), rate),
        confidence: 'needs-input',
        advisorQuestion: `Did you spend more than ~€${threshold.toLocaleString()} on uncovered medical costs (co-pays, dental, glasses, physio)? Current entry: €${s.medicalCosts ?? 0}.`,
        applyField: 'medical_costs',
        documents: ['Receipts for all out-of-pocket medical/dental costs', 'Prescription receipts (Rezeptgebühren)', 'Dental bill (Heil- und Kostenplan)', 'Optician receipt for prescribed glasses/lenses'],
        alreadyClaiming: (s.medicalCosts ?? 0) > 0,
        atCap: false,
    }
}

function detectDisability(
    personal: PersonalData,
    rate: number,
): DeductionOpportunity | null {
    if (personal.isDisabled && (personal.disabilityGrade ?? 0) >= 20) return null

    return {
        id: 'disability_grade',
        title: 'Disability Tax Allowance (Behinderten-Pauschbetrag §33b)',
        lawRef: '§33b EStG',
        description: 'If you have a recognised disability (GdB ≥ 20), you qualify for an annual flat-rate allowance — €384 (GdB 20) up to €2,840 (GdB 100). No receipts needed: just the GdB certificate.',
        estimatedSavingMin: savingEst(384, rate),
        estimatedSavingMax: savingEst(2_840, rate),
        confidence: 'needs-input',
        advisorQuestion: 'Do you hold a Schwerbehindertenausweis or any official disability certificate? If yes, what is your Grad der Behinderung (GdB)?',
        applyField: 'disability_grade',
        documents: ['Schwerbehindertenausweis (disability ID card)', 'Or: Feststellungsbescheid from Versorgungsamt'],
        alreadyClaiming: false,
        atCap: false,
    }
}

// ---------------------------------------------------------------------------
// Deduction score calculation
// ---------------------------------------------------------------------------

function computeScore(
    opportunities: DeductionOpportunity[],
    totalPotential: number,
    _maxPossible: number,
): number {
    const claimedOrAtCap = opportunities.filter((o) => o.atCap || (o.alreadyClaiming && o.confidence !== 'needs-input'))
    const claimedValue = claimedOrAtCap.reduce((sum, o) => sum + o.estimatedSavingMax, 0)
    const total = claimedValue + totalPotential
    if (total <= 0) return 100
    return Math.round((claimedValue / total) * 100)
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function computeOpportunities(
    personal: PersonalData,
    employment: EmploymentData,
    otherIncome: OtherIncomeData,
    deductions: DeductionsData,
    specialExpenses: SpecialExpensesData,
    result: TaxBreakdown | null,
    params: TaxYearParameters = DEFAULT_PARAMS_2026,
): OpportunitySummary {
    const grossIncome = employment.grossSalary + employment.bonus
        + Math.max(0, otherIncome.selfEmployedRevenue - otherIncome.selfEmployedExpenses)
        + Math.max(0, otherIncome.rentalIncome - otherIncome.rentalExpenses)

    const zve = result?.zve ?? Math.max(0, grossIncome - params.werbungskosten_pauschale)
    const rate = getMarginalRate(zve)

    // Run all detectors
    const raw: Array<DeductionOpportunity | null> = [
        detectHealthInsurance(specialExpenses, grossIncome, rate),
        detectHomeOffice(deductions, params, rate),
        detectWorkEquipment(deductions, employment, rate),
        detectWorkTraining(deductions, employment, rate),
        detectUnionFees(deductions, employment, rate),
        detectLongTermCare(specialExpenses, grossIncome, rate),
        detectPension(specialExpenses, params, personal.isMarried, rate),
        detectRiester(specialExpenses, params, personal.isMarried, rate),
        detectDonations(specialExpenses, grossIncome, rate),
        detectChildcare(specialExpenses, params, personal.numChildren, rate),
        detectMedicalCosts(specialExpenses, grossIncome, personal.isMarried, personal.numChildren, rate),
        detectDisability(personal, rate),
    ]

    const opportunities = raw.filter((o): o is DeductionOpportunity => o !== null)

    // Sort: confirmed first, then by estimated max saving desc
    opportunities.sort((a, b) => {
        const confOrder = { confirmed: 0, likely: 1, 'needs-input': 2 }
        if (confOrder[a.confidence] !== confOrder[b.confidence]) {
            return confOrder[a.confidence] - confOrder[b.confidence]
        }
        return b.estimatedSavingMax - a.estimatedSavingMax
    })

    const unclaimed = opportunities.filter((o) => !o.alreadyClaiming)
    const totalPotentialSavingMin = unclaimed.reduce((s, o) => s + o.estimatedSavingMin, 0)
    const totalPotentialSavingMax = unclaimed.reduce((s, o) => s + o.estimatedSavingMax, 0)
    const maxPossible = totalPotentialSavingMax + (result ? result.total_tax : 0)

    const deductionScore = computeScore(opportunities, totalPotentialSavingMax, maxPossible)

    return {
        opportunities,
        deductionScore,
        totalPotentialSavingMin,
        totalPotentialSavingMax,
        marginalRate: rate,
    }
}
