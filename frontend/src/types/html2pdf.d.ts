/**
 * Minimal ambient type declarations for html2pdf.js.
 * Full docs: https://ekoopmans.github.io/html2pdf.js/
 */
declare module 'html2pdf.js' {
    interface Html2PdfOptions {
        margin?: number | [number, number, number, number]
        filename?: string
        image?: { type?: string; quality?: number }
        html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean }
        jsPDF?: { unit?: string; format?: string; orientation?: string }
        pagebreak?: { mode?: string | string[] }
    }

    interface Html2Pdf {
        from(element: HTMLElement): Html2Pdf
        set(options: Html2PdfOptions): Html2Pdf
        save(): Promise<void>
        outputPdf(type: string): Promise<Blob>
    }

    function html2pdf(): Html2Pdf
    function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2Pdf

    export = html2pdf
}
