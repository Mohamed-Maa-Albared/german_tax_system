/**
 * ELSTER XML Export — SmartTax Germany
 *
 * Generates a simplified XML representation of the tax return data that
 * follows the rough structure of an ELSTER/EStG Anlage.  This is intended
 * as a human-readable export / starting template, NOT a certified ERiC
 * submission file.  Users should review and submit via the official ELSTER
 * portal (elster.de).
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
        '  SmartTax Germany — ELSTER Export (Vereinfachte Einkommensteuererklärung)',
        `  Steuerjahr: ${year}`,
        `  Erstellt: ${today()}`,
        '  HINWEIS: Diese Datei ist KEIN zertifiziertes ELSTER-Übermittlungsformat.',
        '  Sie dient als Übersicht und Hilfe beim Ausfüllen der offiziellen Steuererklärung.',
        '  Bitte reichen Sie Ihre Steuererklärung über das offizielle ELSTER-Portal ein: https://www.elster.de',
        '-->',
        `<Steuererklärung xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Jahr="${esc(year)}" Art="ESt">`,
        '  <Allgemein>',
        `    <Erstellungsdatum>${today()}</Erstellungsdatum>`,
        `    <Software>SmartTax Germany</Software>`,
        `    <Version>2026.1</Version>`,
        '  </Allgemein>',
        '',
        '  <!-- Steuerpflichtiger (Anlage Hauptvordruck) -->',
        '  <Identifikation>',
        `    <Veranlagungsart>${personal.isMarried ? 'Zusammenveranlagung' : 'Einzelveranlagung'}</Veranlagungsart>`,
        `    <Steuerjahr>${esc(year)}</Steuerjahr>`,
        `    <Kinder>${esc(personal.numChildren)}</Kinder>`,
        `    <Kirchensteuerpflicht>${personal.isChurchMember ? 'ja' : 'nein'}</Kirchensteuerpflicht>`,
        personal.isDisabled
            ? `    <Behinderung GdB="${esc(personal.disabilityGrade ?? 0)}">ja</Behinderung>`
            : '    <Behinderung>nein</Behinderung>',
        '  </Identifikation>',
        '',
        '  <!-- Anlage N: Einkünfte aus nichtselbstständiger Arbeit -->',
        '  <AnlageN>',
        `    <Bruttoarbeitslohn>${eur(breakdown.employment_gross)}</Bruttoarbeitslohn>`,
        `    <EinbehaltLohnsteuer>${eur(breakdown.lohnsteuer_withheld)}</EinbehaltLohnsteuer>`,
        `    <EinbehaltSolidaritätszuschlag>${eur(breakdown.soli_withheld)}</EinbehaltSolidaritätszuschlag>`,
        `    <EinbehaltKirchensteuer>${eur(breakdown.kirchensteuer_withheld)}</EinbehaltKirchensteuer>`,
        `    <Werbungskosten>${eur(breakdown.werbungskosten_used)}</Werbungskosten>`,
        '  </AnlageN>',
    ]

    if ((breakdown.self_employed_net ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- Anlage G/S: Einkünfte aus selbstständiger/gewerblicher Arbeit -->',
            '  <AnlageS>',
            `    <Gewinn>${eur(breakdown.self_employed_net)}</Gewinn>`,
            '  </AnlageS>',
        )
    }

    if ((breakdown.rental_net ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- Anlage V: Einkünfte aus Vermietung und Verpachtung -->',
            '  <AnlageV>',
            `    <Überschuss>${eur(breakdown.rental_net)}</Überschuss>`,
            '  </AnlageV>',
        )
    }

    if ((breakdown.investment_income ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- Anlage KAP: Einkünfte aus Kapitalvermögen -->',
            '  <AnlageKAP>',
            `    <KapitaleinküfteVorAbzug>${eur(breakdown.investment_income)}</KapitaleinküfteVorAbzug>`,
            `    <SparerPauschbetrag>${eur(breakdown.sparer_pauschbetrag_used ?? 1000)}</SparerPauschbetrag>`,
            `    <AbgeltungsteuerEinbehalten>${eur(breakdown.capital_tax_withheld)}</AbgeltungsteuerEinbehalten>`,
            '  </AnlageKAP>',
        )
    }

    lines.push(
        '',
        '  <!-- Sonderausgaben (Anlage Sonderausgaben) -->',
        '  <Sonderausgaben>',
        `    <GesamtAbzug>${eur(breakdown.sonderausgaben_used)}</GesamtAbzug>`,
        '  </Sonderausgaben>',
    )

    if ((breakdown.aussergewoehnliche_belastungen ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- Außergewöhnliche Belastungen (§33 EStG) -->',
            '  <AussergewoehnlicheBelastungen>',
            `    <AbzugsfähigerBetrag>${eur(breakdown.aussergewoehnliche_belastungen)}</AbzugsfähigerBetrag>`,
            '  </AussergewoehnlicheBelastungen>',
        )
    }

    if ((breakdown.disability_pauschbetrag_used ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- §33b EStG Behinderten-Pauschbetrag -->',
            '  <BehindertenPauschbetrag>',
            `    <GdB>${esc(personal.disabilityGrade ?? 0)}</GdB>`,
            `    <Pauschbetrag>${eur(breakdown.disability_pauschbetrag_used)}</Pauschbetrag>`,
            '  </BehindertenPauschbetrag>',
        )
    }

    if ((breakdown.kinderfreibetrag_used ?? 0) > 0) {
        lines.push(
            '',
            '  <!-- Kinder (Anlage Kind) -->',
            '  <AnlageKind>',
            `    <Kinderfreibetrag>${eur(breakdown.kinderfreibetrag_used)}</Kinderfreibetrag>`,
            `    <Kindergeld>${eur(breakdown.kindergeld_annual)}</Kindergeld>`,
            '  </AnlageKind>',
        )
    }

    lines.push(
        '',
        '  <!-- Berechnung Einkommensteuer -->',
        '  <Berechnung>',
        `    <GesamtbetragEinkuenfte>${eur(breakdown.gesamtbetrag_der_einkuenfte)}</GesamtbetragEinkuenfte>`,
        `    <ZuVersteuerndesEinkommen>${eur(breakdown.zve)}</ZuVersteuerndesEinkommen>`,
        `    <TariflicheEinkommensteuer>${eur(breakdown.tarifliche_est)}</TariflicheEinkommensteuer>`,
        `    <Solidaritätszuschlag>${eur(breakdown.solidaritaetszuschlag)}</Solidaritätszuschlag>`,
        `    <Kirchensteuer>${eur(breakdown.kirchensteuer)}</Kirchensteuer>`,
        `    <GesamtsteuerbelastungProgressiv>${eur(
            (breakdown.tarifliche_est ?? 0) + (breakdown.solidaritaetszuschlag ?? 0) + (breakdown.kirchensteuer ?? 0)
        )}</GesamtsteuerbelastungProgressiv>`,
        `    <AbgeltungsteuerAufKapitaleinkuenfte>${eur(breakdown.capital_tax_flat)}</AbgeltungsteuerAufKapitaleinkuenfte>`,
        `    <GesamteSteuerlast>${eur(breakdown.total_tax)}</GesamteSteuerlast>`,
        '  </Berechnung>',
        '',
        '  <!-- Ergebnis -->',
        '  <Ergebnis>',
        `    <BereitsAbgeführteSteuern>${eur(breakdown.total_withheld)}</BereitsAbgeführteSteuern>`,
    )

    const rop = breakdown.refund_or_payment ?? 0
    if (rop >= 0) {
        lines.push(`    <Erstattung>${eur(rop)}</Erstattung>`)
    } else {
        lines.push(`    <Nachzahlung>${eur(Math.abs(rop))}</Nachzahlung>`)
    }

    lines.push(
        '  </Ergebnis>',
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
