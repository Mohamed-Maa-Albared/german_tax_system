/**
 * ELSTER XML Export — SmartTax Germany
 *
 * Generates a human-readable XML reference document that mirrors the structure
 * of a German Einkommensteuererklärung. This is designed to help you fill in
 * the official ELSTER forms accurately.
 *
 * WHAT THIS FILE IS:
 *   A structured summary of your tax data, organised by ELSTER Anlage (section).
 *   Each value maps directly to a named field in the official ELSTER forms.
 *
 * WHAT THIS FILE IS NOT:
 *   This is NOT an official ERiC submission file and cannot be uploaded directly
 *   to ELSTER. It does not have a certified digital signature.
 *
 * HOW TO USE IT:
 *   1. Open the file in any text editor (Notepad, TextEdit, VS Code) or XML viewer.
 *   2. Use the values as a reference while filling in your return on elster.de
 *      or in a licensed tax software (WISO, Taxfix, etc.).
 *   3. The XML comments explain which ELSTER field each value corresponds to.
 *   4. After reviewing, submit your completed return via the official ELSTER portal.
 *
 * LEGAL NOTE:
 *   Always verify figures with your Lohnsteuerbescheinigung and original receipts.
 *   Consult a Steuerberater for complex cases.
 */
import type { PersonalData, TaxBreakdown } from '../types/tax'

interface ElsterExportInput {
    personal: PersonalData
    breakdown: TaxBreakdown
}

/** Escape XML special characters to prevent injection. */
function esc(value: string | number | undefined | null): string {
    if (value === undefined || value === null) return ''
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function eur(value: number | undefined): string {
    return esc(Math.round(value ?? 0))
}

/** Format date as YYYY-MM-DD */
function today(): string {
    return new Date().toISOString().slice(0, 10)
}

export function generateElsterXml(input: ElsterExportInput): string {
    const { personal, breakdown } = input
    const year = breakdown.tax_year ?? personal.taxYear ?? 2026

    const lines: string[] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!--',
        '  ╔══════════════════════════════════════════════════════════════╗',
        '  ║        SmartTax Germany — ELSTER Referenzdokument           ║',
        `  ║        Steuerjahr: ${year}   Erstellt: ${today()}          ║`,
        '  ╚══════════════════════════════════════════════════════════════╝',
        '',
        '  ZWECK DIESER DATEI (Purpose of this file):',
        '  Diese XML-Datei ist ein Referenzdokument für Ihre Einkommensteuererklärung.',
        '  This XML file is a reference document for your income tax return.',
        '',
        '  WIE VERWENDEN (How to use):',
        '  1. Öffnen Sie elster.de und melden Sie sich an / Go to elster.de and log in',
        '  2. Wählen Sie "Formulare & Leistungen → Einkommensteuererklärung" / Select the ESt form',
        '  3. Übertragen Sie die Werte aus dieser Datei in die entsprechenden ELSTER-Felder',
        '     Transfer the values from this file into the matching ELSTER form fields',
        '  4. Die XML-Kommentare zeigen die deutschen Feldbezeichnungen / Comments show German field names',
        '',
        '  WICHTIGER HINWEIS / IMPORTANT:',
        '  Diese Datei KANN NICHT direkt bei ELSTER hochgeladen werden.',
        '  This file CANNOT be uploaded directly to ELSTER — it is a reference only.',
        '  Reichen Sie Ihre Steuererklärung über das offizielle ELSTER-Portal ein: https://www.elster.de',
        '-->',
        `<Steuererklärung xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Jahr="${esc(year)}" Art="ESt">`,
        '',
        '  <!-- ═══ ALLGEMEINE INFORMATIONEN ═══ -->',
        '  <Allgemein>',
        `    <Erstellungsdatum>${today()}</Erstellungsdatum>`,
        `    <Software>SmartTax Germany</Software>`,
        `    <Version>2026.1</Version>`,
        '  </Allgemein>',
        '',
        '  <!-- ═══ IDENTIFIKATION / MANTELBOGEN ESt 1 A ═══',
        '       ELSTER: Hauptvordruck → Persönliche Angaben',
        '       You will need your Steueridentifikationsnummer (11-digit tax ID).',
        '       Found on: Lohnsteuerbescheinigung, Einkommensteuerbescheid, or vom Bundeszentralamt für Steuern.',
        '  -->',
        '  <Identifikation>',
        `    <!-- Veranlagungsart: Einzelveranlagung (single) or Zusammenveranlagung (joint/married) -->`,
        `    <!-- ELSTER field: Zeile 18 "Zusammenveranlagung" checkbox -->`,
        `    <Veranlagungsart>${personal.isMarried ? 'Zusammenveranlagung' : 'Einzelveranlagung'}</Veranlagungsart>`,
        `    <Steuerjahr>${esc(year)}</Steuerjahr>`,
        `    <!-- Number of children qualifying for Kinderfreibetrag -->`,
        `    <!-- ELSTER: Anlage Kind → fill one form per child -->`,
        `    <Kinder>${esc(personal.numChildren)}</Kinder>`,
        `    <!-- Church tax: if yes, enter your church in Mantelbogen Zeile 11 -->`,
        `    <Kirchensteuerpflicht>${personal.isChurchMember ? 'ja' : 'nein'}</Kirchensteuerpflicht>`,
        personal.isDisabled
            ? `    <!-- Disability: claim Pauschbetrag §33b EStG automatically — enter GdB in Anlage Außergewöhnliche Belastungen -->
    <Behinderung GdB="${esc(personal.disabilityGrade ?? 0)}">ja — Pauschbetrag §33b EStG beantragt</Behinderung>`
            : '    <Behinderung>nein</Behinderung>',
        '  </Identifikation>',
        '',
        '  <!-- ═══ ANLAGE N: EINKÜNFTE AUS NICHTSELBSTSTÄNDIGER ARBEIT ═══',
        '       Where to find these values: Lohnsteuerbescheinigung (from your employer, sent by February)',
        '       ELSTER: Anlage N → Einnahmen / Arbeitnehmer-Pauschbetrag',
        '  -->',
        '  <AnlageN>',
        `    <!-- Zeile 6: Bruttoarbeitslohn — copy from Lohnsteuerbescheinigung field 3 -->`,
        `    <Bruttoarbeitslohn>${eur(breakdown.employment_gross)}</Bruttoarbeitslohn>`,
        `    <!-- Zeile 7: Einbehaltene Lohnsteuer — copy from Lohnsteuerbescheinigung field 4 -->`,
        `    <EinbehaltLohnsteuer>${eur(breakdown.lohnsteuer_withheld)}</EinbehaltLohnsteuer>`,
        `    <!-- Zeile 9: Einbehaltener Solidaritätszuschlag — Lohnsteuerbescheinigung field 6 -->`,
        `    <EinbehaltSolidaritätszuschlag>${eur(breakdown.soli_withheld)}</EinbehaltSolidaritätszuschlag>`,
        `    <!-- Zeile 10: Einbehaltene Kirchensteuer — Lohnsteuerbescheinigung field 7 (if applicable) -->`,
        `    <EinbehaltKirchensteuer>${eur(breakdown.kirchensteuer_withheld)}</EinbehaltKirchensteuer>`,
        `    <!-- Zeilen 31–99: Werbungskosten — itemised deductions over the €1,230 Pauschale -->`,
        `    <!-- Enter details in Anlage N: Pendlerpauschale (Zeile 31), Homeoffice (Zeile 60), etc. -->`,
        `    <Werbungskosten_Gesamt>${eur(breakdown.werbungskosten_used)}</Werbungskosten_Gesamt>`,
        '  </AnlageN>',
    ]

    if ((breakdown.self_employed_net ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- ═══ ANLAGE S/G: SELBSTSTÄNDIGE / GEWERBLICHE EINKÜNFTE ═══',
            '       ELSTER: Anlage S (Freiberufler/Selbstständige) or Anlage G (Gewerbetreibende)',
            '       You must attach your EÜR (Einnahmen-Überschuss-Rechnung) as Anlage EÜR.',
            '  -->',
            '  <AnlageS>',
            `    <!-- Zeile 4: Gewinn aus freiberuflicher/selbstständiger Tätigkeit (net after expenses) -->`,
            `    <Gewinn>${eur(breakdown.self_employed_net)}</Gewinn>`,
            '  </AnlageS>',
        )
    }

    if ((breakdown.rental_net ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- ═══ ANLAGE V: EINKÜNFTE AUS VERMIETUNG UND VERPACHTUNG ═══',
            '       ELSTER: Anlage V — one form per property',
            '       Enter gross rental income and deductible costs (repairs, depreciation, interest).',
            '  -->',
            '  <AnlageV>',
            `    <!-- Net rental income after allowable expenses (Werbungskosten aus Vermietung) -->`,
            `    <Überschuss>${eur(breakdown.rental_net)}</Überschuss>`,
            '  </AnlageV>',
        )
    }

    if ((breakdown.investment_income ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- ═══ ANLAGE KAP: EINKÜNFTE AUS KAPITALVERMÖGEN ═══',
            '       ELSTER: Anlage KAP — needed if you want to reclaim over-withheld Abgeltungsteuer',
            '       or if your capital income is below the Sparer-Pauschbetrag (€1,000 / €2,000 joint).',
            '       Source: annual tax statement (Jahressteuerbescheinigung) from your bank.',
            '  -->',
            '  <AnlageKAP>',
            `    <!-- Total capital income before Sparer-Pauschbetrag deduction -->`,
            `    <!-- ELSTER Zeile 7: Kapitalerträge, die dem inländischen Steuerabzug unterlegen haben -->`,
            `    <KapitaleinküfteVorAbzug>${eur(breakdown.investment_income)}</KapitaleinküfteVorAbzug>`,
            `    <!-- Sparer-Pauschbetrag: €1,000 (single) or €2,000 (joint) — always claim this! -->`,
            `    <!-- ELSTER: automatically applied; just check your bank's Freistellungsauftrag -->`,
            `    <SparerPauschbetrag>${eur(breakdown.sparer_pauschbetrag_used ?? 1_000)}</SparerPauschbetrag>`,
            `    <!-- Abgeltungsteuer already withheld by your bank — claim a refund if over-withheld -->`,
            `    <AbgeltungsteuerEinbehalten>${eur(breakdown.capital_tax_withheld)}</AbgeltungsteuerEinbehalten>`,
            '  </AnlageKAP>',
        )
    }

    lines.push(
        '',
        '  <!-- ═══ SONDERAUSGABEN (ANLAGE VORSORGEAUFWAND) ═══',
        '       ELSTER: Anlage Vorsorgeaufwand for insurance/pension; main form for donations/childcare.',
        '       Source: annual statements from your insurer, pension provider, and charity receipts.',
        '  -->',
        '  <Sonderausgaben>',
        `    <!-- Total Sonderausgaben actually applied (after Pauschale comparison of €36/€72) -->`,
        `    <!-- Break down individual items in ELSTER: health ins (Zeile 12), pension (Zeile 4), etc. -->`,
        `    <GesamtAbzug>${eur(breakdown.sonderausgaben_used)}</GesamtAbzug>`,
        '  </Sonderausgaben>',
    )

    if ((breakdown.aussergewoehnliche_belastungen ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- ═══ AUSSERGEWÖHNLICHE BELASTUNGEN (§33 EStG) ═══',
            '       ELSTER: Mantelbogen Zeilen 67–70 (medical costs, disability, etc.)',
            '       Only costs ABOVE your "zumutbare Belastung" threshold are deductible.',
            '       Keep all original medical receipts and proof of payment.',
            '  -->',
            '  <AussergewoehnlicheBelastungen>',
            `    <!-- Net deductible amount after subtracting the "zumutbare Belastung" threshold -->`,
            `    <AbzugsfähigerBetrag>${eur(breakdown.aussergewoehnliche_belastungen)}</AbzugsfähigerBetrag>`,
            '  </AussergewoehnlicheBelastungen>',
        )
    }

    if ((breakdown.disability_pauschbetrag_used ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- ═══ §33b EStG BEHINDERTEN-PAUSCHBETRAG ═══',
            '       ELSTER: Anlage Außergewöhnliche Belastungen → Behinderung',
            '       Proof needed: Schwerbehindertenausweis or official GdB determination notice.',
            '       This is automatically deducted — no receipts needed, just the official disability card.',
            '  -->',
            '  <BehindertenPauschbetrag>',
            `    <!-- GdB (Grad der Behinderung) — from your Schwerbehindertenausweis -->`,
            `    <GdB>${esc(personal.disabilityGrade ?? 0)}</GdB>`,
            `    <!-- Annual Pauschbetrag deducted from taxable income — scales with GdB level -->`,
            `    <Pauschbetrag>${eur(breakdown.disability_pauschbetrag_used)}</Pauschbetrag>`,
            '  </BehindertenPauschbetrag>',
        )
    }

    if ((breakdown.kinderfreibetrag_used ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- ═══ ANLAGE KIND (§32 EStG) ═══',
            '       ELSTER: Anlage Kind — fill one form per child.',
            '       The tax office automatically compares Kinderfreibetrag vs. Kindergeld (Günstigerprüfung)',
            '       and uses whichever gives you a better result — you just need to claim one form.',
            '       Kindergeld (€259/month) is paid separately by the Familienkasse — not via ELSTER.',
            '  -->',
            '  <AnlageKind>',
            `    <!-- Kinderfreibetrag applied: €9,756/child. Only used if this saves more than Kindergeld. -->`,
            `    <Kinderfreibetrag>${eur(breakdown.kinderfreibetrag_used)}</Kinderfreibetrag>`,
            `    <!-- Annual Kindergeld received (for Günstigerprüfung comparison) -->`,
            `    <KindergeldJahresbetrag>${eur(breakdown.kindergeld_annual)}</KindergeldJahresbetrag>`,
            '  </AnlageKind>',
        )
    }

    lines.push(
        '',
        '  <!-- ═══ BERECHNUNG EINKOMMENSTEUER ═══',
        '       These figures are calculated by SmartTax Germany using §32a EStG (2026 parameters).',
        '       The official Finanzamt will recalculate — your Steuerbescheid is the authoritative result.',
        '  -->',
        '  <Berechnung>',
        `    <!-- Sum of all income categories before deductions -->`,
        `    <GesamtbetragEinkuenfte>${eur(breakdown.gesamtbetrag_der_einkuenfte)}</GesamtbetragEinkuenfte>`,
        `    <!-- ZVE = taxable income after all deductions. This is used for the §32a tariff. -->`,
        `    <ZuVersteuerndesEinkommen>${eur(breakdown.zve)}</ZuVersteuerndesEinkommen>`,
        `    <!-- Income tax per §32a EStG on ZVE (Einkommensteuer) -->`,
        `    <TariflicheEinkommensteuer>${eur(breakdown.tarifliche_est)}</TariflicheEinkommensteuer>`,
        `    <!-- Soli: 5.5% of income tax, only if income tax > €20,350 (single) / €40,700 (joint) -->`,
        `    <Solidaritätszuschlag>${eur(breakdown.solidaritaetszuschlag)}</Solidaritätszuschlag>`,
        `    <!-- Church tax: 9% or 8% of income tax (only if Kirchensteuerpflicht = ja) -->`,
        `    <Kirchensteuer>${eur(breakdown.kirchensteuer)}</Kirchensteuer>`,
        `    <!-- Total progressive taxes combined -->`,
        `    <GesamtsteuerbelastungProgressiv>${eur(
            (breakdown.tarifliche_est ?? 0) + (breakdown.solidaritaetszuschlag ?? 0) + (breakdown.kirchensteuer ?? 0)
        )}</GesamtsteuerbelastungProgressiv>`,
        `    <!-- Abgeltungsteuer on investment income (25% + Soli) — already withheld by bank -->`,
        `    <AbgeltungsteuerAufKapitaleinkuenfte>${eur(breakdown.capital_tax_flat)}</AbgeltungsteuerAufKapitaleinkuenfte>`,
        `    <!-- Grand total tax liability (progressive + flat capital tax) -->`,
        `    <GesamteSteuerlast>${eur(breakdown.total_tax)}</GesamteSteuerlast>`,
        '  </Berechnung>',
        '',
        '  <!-- ═══ ERGEBNIS ═══',
        '       Positive = Erstattung (refund) — the Finanzamt will pay this to your registered bank account.',
        '       Negative = Nachzahlung (additional payment due) — you must pay within 1 month of Steuerbescheid.',
        '  -->',
        '  <Ergebnis>',
        `    <!-- All taxes already deducted from your salary/withheld during the year -->`,
        `    <BereitsAbgeführteSteuern>${eur(breakdown.total_withheld)}</BereitsAbgeführteSteuern>`,
    )

    const rop = breakdown.refund_or_payment ?? 0
    if (rop >= 0) {
        lines.push(`    <!-- ERSTATTUNG: Tax office will transfer this to your registered bank account (~4-12 weeks) -->`)
        lines.push(`    <Erstattung>${eur(rop)}</Erstattung>`)
    } else {
        lines.push(`    <!-- NACHZAHLUNG: Pay this amount within 1 month of receiving your Steuerbescheid -->`)
        lines.push(`    <Nachzahlung>${eur(Math.abs(rop))}</Nachzahlung>`)
    }

    lines.push(
        '  </Ergebnis>',
        '',
        '  <!-- ═══ NÄCHSTE SCHRITTE / NEXT STEPS ═══',
        '  1. Steueridentifikationsnummer bereithalten (your 11-digit tax ID)',
        '  2. Lohnsteuerbescheinigung vom Arbeitgeber prüfen (check employer\'s certificate)',
        '  3. Belege für alle Abzüge sammeln (gather receipts for all deductions claimed)',
        '  4. Bei elster.de anmelden und ESt-Erklärung ausfüllen (log in and complete the return)',
        '  5. Elektronisch einreichen (submit electronically — faster processing)',
        '  6. Steuerbescheid abwarten und prüfen (await and review tax assessment)',
        '  7. Bei Abweichungen: Einspruch fristgerecht einlegen (appeal within 1 month if incorrect)',
        '  -->',
        '</Steuererklärung>',
    )

    return lines.join('\n')
}

/** Trigger a browser download of the generated XML. */
export function downloadElsterXml(input: ElsterExportInput): void {
    const xml = generateElsterXml(input)
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smarttax_${input.breakdown.tax_year ?? 2026}_elster_export.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
