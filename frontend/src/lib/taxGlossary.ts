/**
 * Pre-written plain-English explanations for German tax terms.
 * Shown instantly in AIHint — no model call needed for fixed terms.
 * For free-form questions, users go to the Tax Advisor chat page.
 */

export interface GlossaryEntry {
    summary: string          // 2-3 sentence plain English
    whereToFind?: string     // How to find this number
    tip?: string             // Quick savings tip if applicable
}

export const TAX_GLOSSARY: Record<string, GlossaryEntry> = {
    rentenversicherung: {
        summary:
            'The statutory pension insurance (Gesetzliche Rentenversicherung) — Germany\'s mandatory public pension system. ' +
            'You contribute 9.3% of gross salary and your employer matches it (18.6% total). ' +
            'Both the employee and employer shares are deductible up to €30,826/year (single) or €61,652/year (joint filing) in 2026.',
        whereToFind:
            'Box 22a of your Lohnsteuerbescheinigung shows your employee share. ' +
            'Double that figure to include your employer\'s matching contribution, which is also deductible.',
        tip: 'Most employees don\'t realise the employer share is also deductible — this can add several thousand euros to your deductions.',
    },

    'homeoffice-pauschale': {
        summary:
            'The home office flat-rate allowance lets you claim €6 per day you worked entirely from home, up to a maximum of 210 days (€1,260/year). ' +
            'You do NOT need a dedicated room — it applies to any day you worked from home, even at the kitchen table. ' +
            'You cannot claim both the home office deduction and the commute deduction for the same day.',
        whereToFind:
            'Count the days using your calendar, HR portal, or email records — any evidence of days worked from home. From 2026 the tax office may request proof, so keep a log.',
        tip: '210 days at €6 = €1,260 free money on your tax bill. If you ever worked from home even occasionally, claim every qualifying day.',
    },

    'außergewöhnliche belastungen': {
        summary:
            'Extraordinary burdens (§33 EStG) cover unavoidable major costs that significantly reduce your ability to pay tax — mainly medical costs not covered by health insurance, glasses, dental treatment, disability adaptations, and care costs. ' +
            'Only the amount above your personal "reasonable burden" threshold (zumutbare Belastung) is deductible. ' +
            'This threshold is 1–7% of your income, depending on your income level and family situation.',
        whereToFind:
            'Your receipts, pharmacy invoices, dentist bills, and prescription co-pay records. Keep all medical receipts throughout the year in one folder.',
        tip: 'If you had a large one-time cost (e.g. dental implant, special glasses), it\'s worth adding up all your medical costs for the year — once you exceed your threshold, everything above it is deductible.',
    },

    'außergewöhnliche belastungen — krankheitskosten': {
        summary:
            'Medical costs not reimbursed by your health insurance — co-payments, private dental work, prescription charges, physiotherapy, glasses. ' +
            'Only costs above your personal threshold (1-7% of income) are deductible. ' +
            'Cosmetic procedures and wellness treatments are generally not deductible.',
        whereToFind: 'Your pharmacy receipts, dentist invoices, and health insurance annual statements showing what they did NOT cover.',
    },

    // Capital income
    abgeltungsteuer: {
        summary:
            'Germany\'s flat 25% withholding tax on capital income (Abgeltungsteuer) — applied automatically to dividends, interest, and investment gains by your bank. ' +
            'Your bank withholds this amount and pays it directly to the tax office on your behalf. ' +
            'The first €1,000/year of capital income per person is tax-free (Sparer-Pauschbetrag).',
        whereToFind:
            'Your bank or broker\'s annual tax certificate (Jahressteuerbescheinigung / Steuerbescheinigung) — typically sent in February. Look for "einbehaltene Kapitalertragsteuer".',
        tip: 'If you earned less than €1,000 in capital income but the bank withheld tax anyway (because you didn\'t submit a Freistellungsauftrag), you can reclaim it via your tax return.',
    },

    'sparer-pauschbetrag': {
        summary:
            'The €1,000 annual tax-free allowance on investment income per person (€2,000 for married couples). ' +
            'Before any tax is applied to dividends, interest, or gains, this amount is subtracted. ' +
            'To use this at source with your bank, submit a Freistellungsauftrag (tax exemption order).',
        whereToFind: 'Contact your bank to check if you have a Freistellungsauftrag in place — if not, submit one online through your bank\'s portal.',
        tip: 'You can split your €1,000 allowance across multiple banks. Submit a Freistellungsauftrag to each one proportionally so you get the full benefit without your bank withholding tax unnecessarily.',
    },

    // Pension/retirement
    riester: {
        summary:
            'A government-subsidised private pension contract. You contribute and the government adds annual subsidies (Zulagen): €175 base + €185 per child. ' +
            'Contributions up to €2,100/year (€4,200 joint) are also deductible as Sonderausgaben — the tax office automatically gives you whichever benefit (allowance vs. tax deduction) is greater. ' +
            'Available to anyone paying into the statutory pension system.',
        whereToFind: 'Your Riester provider\'s annual statement. The Zulagebescheinigung confirms your contributions and any government subsidies received.',
        tip: 'Even contributing the minimum (4% of previous year\'s gross minus government subsidies) maximises your state allowances. Check if you\'re contributing enough.',
    },

    // Work deductions
    werbungskosten: {
        summary:
            'All costs directly caused by your employment — commuting, home office, work equipment, professional training, union fees. ' +
            'A flat-rate Pauschbetrag of €1,230/year is applied automatically; you only save extra tax if your actual costs exceed this. ' +
            'Keep receipts for everything work-related in case the tax office asks for proof.',
        whereToFind: 'Your own records: commute distance (Google Maps), home office calendar, equipment purchase receipts, training invoices.',
        tip: 'Commuting + home office alone can often exceed €1,230. For a 20 km commute with 180 days in office, the deduction is 20 × 180 × €0.38 = €1,368 — already above the flat rate.',
    },

    // Church tax
    kirchensteuer: {
        summary:
            'Church tax is an additional 8% (Bavaria, BW) or 9% (all other states) of your income tax, paid if you are a registered member of a recognised church (Catholic, Lutheran, etc.). ' +
            'It is withheld automatically by your employer if ELStAM records show church membership. ' +
            'You can stop paying by formally leaving the church (Kirchenaustritt) at your local registry office (Standesamt/Amtsgericht).',
        whereToFind: 'Box 24 (or Box 5 if shown separately) of your Lohnsteuerbescheinigung.',
        tip: 'Church tax paid in one year can be deducted as Sonderausgaben in the following year\'s return.',
    },

    // Solidarity surcharge
    solidaritaetszuschlag: {
        summary:
            'The Solidaritätszuschlag ("Soli") is an additional 5.5% surcharge on top of your income tax, originally introduced in 1991 to fund German reunification. ' +
            'From 2021, it was abolished for the vast majority of taxpayers — only those with high incomes (income tax above €20,350 for singles / €40,700 for joint filers in 2026) still pay it. ' +
            'If you see a Soli charge on your Lohnsteuerbescheinigung but your income is modest, it may be because your employer used an imprecise tax class — the return will reconcile this.',
        whereToFind: 'Box 6 of your Lohnsteuerbescheinigung. If it shows €0, you are in the majority who no longer pay Soli.',
    },

    // Basic concepts
    grundfreibetrag: {
        summary:
            'The tax-free personal allowance — the amount of income each person can earn before paying any income tax at all. ' +
            'In 2026 it is €12,348 for a single filer (doubled to €24,696 for married couples filing jointly). ' +
            'Income below this threshold is completely tax-free.',
        whereToFind: 'This is automatically applied — you do not need to claim it.',
    },

    kinderfreibetrag: {
        summary:
            'The child tax allowance of €9,756 per child (2026), which reduces your taxable income. ' +
            'The tax office automatically compares it against the Kindergeld (monthly child benefit of €259/child) you received and uses whichever is more beneficial — you do not need to choose. ' +
            'The Kinderfreibetrag typically benefits higher earners more than Kindergeld.',
        whereToFind: 'Applied automatically by the tax office. Check the "Günstigerprüfung" result on your Steuerbescheid to see which was used.',
        tip: 'Even if the tax office ends up using Kindergeld instead of the Kinderfreibetrag (because it was better for you), there\'s no downside to entering your children — it can only help.',
    },

    kindergeld: {
        summary:
            'Monthly cash benefit of €259 per child (2026) paid by the Familienkasse to parents, regardless of income. ' +
            'Applies to children under 18, or under 25 if still in education or training. ' +
            'The tax office compares it with the Kinderfreibetrag and uses the better option — so actual Kinderfreibetrag usage in the return means Kindergeld must be partly "paid back" via tax.',
        whereToFind: 'Your Familienkasse annual statement or bank statements showing monthly Kindergeld receipts.',
    },

    // Ehegattensplitting
    'ehegattensplitting': {
        summary:
            'The joint-filing tax advantage for married couples and registered civil partnerships. ' +
            'The couple\'s combined taxable income is halved, tax is calculated on that half amount, then doubled. ' +
            'Because German tax is progressive, this can save thousands if one partner earns significantly more.',
        whereToFind: 'Applies automatically when you select "married / joint filing" in the wizard.',
        tip: 'If one partner earns €80,000 and the other earns €0, splitting saves roughly €8,000 in tax vs. single filing. The more unequal the incomes, the bigger the saving.',
    },

    // ZVE
    'zu versteuerndes einkommen': {
        summary:
            'The "taxable income" (zu versteuerndes Einkommen, ZVE) is the final figure that the tax rate is applied to. ' +
            'It equals your gross income minus all allowable deductions, allowances, and reliefs. ' +
            'The lower your ZVE, the less tax you pay — maximising legitimate deductions directly reduces this number.',
        whereToFind: 'Shown on your Steuerbescheid under "zu versteuerndes Einkommen". In this app, it is shown in the Tax Calculation section of your results.',
    },
}

/**
 * Look up a term in the glossary, trying various normalisations.
 * Returns null if the term is not found.
 */
export function lookupTerm(term: string): GlossaryEntry | null {
    const key = term.toLowerCase().trim()
    if (TAX_GLOSSARY[key]) return TAX_GLOSSARY[key]
    // Try without special characters
    const simplified = key.replace(/[äöü]/g, (c) => ({ ä: 'a', ö: 'o', ü: 'u' }[c] ?? c))
    for (const [k, v] of Object.entries(TAX_GLOSSARY)) {
        if (k.replace(/[äöü]/g, (c) => ({ ä: 'a', ö: 'o', ü: 'u' }[c] ?? c)) === simplified) {
            return v
        }
    }
    return null
}
