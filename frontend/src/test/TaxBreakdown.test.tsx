// @vitest-environment happy-dom
/**
 * TaxBreakdown component tests
 * Uses happy-dom environment
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TaxBreakdown from '../components/TaxBreakdown'
import { TaxBreakdown as TaxBreakdownType } from '../types/tax'

const mockBreakdown: TaxBreakdownType = {
    tax_year: 2026,
    zve: 38734,
    tarifliche_est: 8200,
    solidaritaetszuschlag: 0,
    kirchensteuer: 0,
    kinderfreibetrag_used: 0,
    kindergeld_annual: 0,
    capital_tax_flat: 0,
    capital_tax_due: 0,
    total_tax: 8200,
    total_withheld: 10000,
    refund_or_payment: 1800,
    effective_rate: 0.205,
    marginal_rate: 0.31,
    gross_income: 40000,
    werbungskosten_used: 1230,
    sonderausgaben_used: 36,
    aussergewoehnliche_belastungen: 0,
    suggestions: ['Consider increasing pension contributions'],
}

describe('TaxBreakdown component', () => {
    it('renders effective rate', () => {
        render(<TaxBreakdown breakdown={mockBreakdown} />)
        expect(screen.getByText('20.5%')).toBeDefined()
    })

    it('renders marginal rate', () => {
        render(<TaxBreakdown breakdown={mockBreakdown} />)
        expect(screen.getByText('31.0%')).toBeDefined()
    })

    it('shows Tax Refund label when refund positive', () => {
        render(<TaxBreakdown breakdown={mockBreakdown} />)
        expect(screen.getByText('Tax Refund')).toBeDefined()
    })

    it('shows Tax Due label when negative refund', () => {
        const owing = { ...mockBreakdown, refund_or_payment: -500 }
        render(<TaxBreakdown breakdown={owing} />)
        expect(screen.getByText('Tax Due')).toBeDefined()
    })

    it('renders ZVE row', () => {
        render(<TaxBreakdown breakdown={mockBreakdown} />)
        expect(screen.getByText('Taxable income (zu versteuerndes Einkommen, ZVE)')).toBeDefined()
    })

    it('renders suggestions section', () => {
        render(<TaxBreakdown breakdown={mockBreakdown} />)
        expect(screen.getByText('// Tax Saving Tips')).toBeDefined()
        expect(screen.getByText('• Consider increasing pension contributions')).toBeDefined()
    })

    it('does not render suggestions when empty', () => {
        const noSuggestions = { ...mockBreakdown, suggestions: [] }
        render(<TaxBreakdown breakdown={noSuggestions} />)
        expect(screen.queryByText('// Tax Saving Tips')).toBeNull()
    })

    it('shows kirchensteuer row when > 0', () => {
        const withKirche = { ...mockBreakdown, kirchensteuer: 750 }
        render(<TaxBreakdown breakdown={withKirche} />)
        expect(screen.getByText('Church tax (Kirchensteuer)')).toBeDefined()
    })

    it('hides kirchensteuer row when 0', () => {
        render(<TaxBreakdown breakdown={mockBreakdown} />)
        expect(screen.queryByText('Church tax (Kirchensteuer)')).toBeNull()
    })

    it('shows soli row when > 0', () => {
        const withSoli = { ...mockBreakdown, solidaritaetszuschlag: 450 }
        render(<TaxBreakdown breakdown={withSoli} />)
        expect(screen.getByText('Solidarity surcharge (Soli)')).toBeDefined()
    })
})
