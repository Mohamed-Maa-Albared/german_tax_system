/**
 * LStBImport — Lohnsteuerbescheinigung XML import.
 *
 * Parses the official ELSTER LStB XML file provided by the employer each year
 * and pre-fills the Employment Income wizard step.
 *
 * Field mapping (§41b EStG numbered fields on the Lohnsteuerbescheinigung):
 *   Nr 3  → Bruttoarbeitslohn          (grossSalary)
 *   Nr 4  → Einbehaltene Lohnsteuer    (lohnsteuer → taxesWithheld)
 *   Nr 5  → Einbehaltener Soli         (soli_withheld, informational)
 *   Nr 6  → Einbehaltene KiSt AG       } combined as kirchensteuer_withheld
 *   Nr 7  → Einbehaltene KiSt AN       }
 *
 * Two ELSTER schema variants are handled automatically:
 *   • Attribute:   <Zeile Nr="3" Betrag="45000.00"/>
 *   • Child text:  <Zeile Nr="3"><Betrag>45000.00</Betrag></Zeile>
 */

import { ChangeEvent, useRef, useState } from 'react'

export interface LStBFields {
    grossSalary: number       // Nr 3
    taxesWithheld: number     // Nr 4 (Lohnsteuer)
    soliWithheld: number      // Nr 5
    kirchensteuerWithheld: number  // Nr 6 + Nr 7
}

interface Props {
    onImport: (fields: LStBFields) => void
}

/** Parse a single numeric field from an ELSTER <Zeile Nr="n"> element.
 *  Handles both attribute-based and child-element schemas. */
function extractField(doc: Document, nr: number): number {
    // Try attribute form: <Zeile Nr="3" Betrag="45000.00"/>
    const attrEl = doc.querySelector(`Zeile[Nr="${nr}"]`)
    if (attrEl) {
        const attr = attrEl.getAttribute('Betrag') ?? attrEl.getAttribute('betrag')
        if (attr !== null) {
            const parsed = parseFloat(attr.replace(',', '.'))
            return isNaN(parsed) ? 0 : parsed
        }
        // Child element form: <Betrag>45000.00</Betrag>
        const child = attrEl.querySelector('Betrag') ?? attrEl.querySelector('betrag')
        if (child?.textContent) {
            const parsed = parseFloat(child.textContent.trim().replace(',', '.'))
            return isNaN(parsed) ? 0 : parsed
        }
    }
    return 0
}

export default function LStBImport({ onImport }: Props) {
    const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    function handleFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Only accept .xml files — size guard against unreasonably large files (>2 MB)
        if (!file.name.toLowerCase().endsWith('.xml')) {
            setStatus('error')
            setMessage('Please select an XML file (.xml) from your employer.')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            setStatus('error')
            setMessage('File is too large. A genuine LStB XML is typically under 100 KB.')
            return
        }

        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string
                const parser = new DOMParser()
                const doc = parser.parseFromString(text, 'text/xml')

                // Abort if the parser itself returned an error document
                const parseError = doc.querySelector('parsererror')
                if (parseError) {
                    throw new Error('The file could not be parsed as valid XML.')
                }

                // Require at least the gross salary field to be non-zero
                const gross = extractField(doc, 3)
                if (gross === 0) {
                    throw new Error(
                        'Could not find field Nr. 3 (Bruttoarbeitslohn). Make sure this is an official employer Lohnsteuerbescheinigung XML.',
                    )
                }

                const fields: LStBFields = {
                    grossSalary: gross,
                    taxesWithheld: extractField(doc, 4),
                    soliWithheld: extractField(doc, 5),
                    kirchensteuerWithheld: extractField(doc, 6) + extractField(doc, 7),
                }

                onImport(fields)
                setStatus('ok')
                setMessage(
                    `Imported: Gross €${gross.toLocaleString('de-DE')}, ` +
                    `Lohnsteuer €${fields.taxesWithheld.toLocaleString('de-DE')}.`,
                )
            } catch (err) {
                setStatus('error')
                setMessage(err instanceof Error ? err.message : 'Unknown import error.')
            } finally {
                // Reset input so the same file can be re-selected after a fix
                if (inputRef.current) inputRef.current.value = ''
            }
        }
        reader.readAsText(file, 'ISO-8859-15')
    }

    return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                        Import from employer XML
                        <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Upload your <strong>Lohnsteuerbescheinigung .xml</strong> file — your employer or payroll
                        software provides it each February — and all fields below will be filled automatically.
                    </p>
                </div>
                <label className="shrink-0 cursor-pointer">
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".xml,application/xml,text/xml"
                        className="sr-only"
                        onChange={handleFile}
                    />
                    <span className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                        Choose file…
                    </span>
                </label>
            </div>

            {status === 'ok' && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
                    <span className="text-green-600 text-sm">✓</span>
                    <p className="text-xs text-green-700">{message}</p>
                </div>
            )}
            {status === 'error' && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
                    <span className="text-red-500 text-sm">✕</span>
                    <p className="text-xs text-red-700">{message}</p>
                </div>
            )}
        </div>
    )
}
