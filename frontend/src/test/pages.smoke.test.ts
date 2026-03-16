// @vitest-environment happy-dom
/**
 * Smoke-import tests: verify every page and major component module compiles
 * and can be imported without errors. Catches missing imports, bad re-exports,
 * and TypeScript errors that would produce a blank/broken UI but aren't
 * exercised by any other test file.
 */
import { describe, expect, it } from 'vitest'

describe('page module smoke imports', () => {
    it('LandingPage imports cleanly', async () => {
        const mod = await import('../pages/LandingPage')
        expect(mod.default).toBeDefined()
    })

    it('TaxWizard imports cleanly', async () => {
        const mod = await import('../pages/TaxWizard')
        expect(mod.default).toBeDefined()
    })

    it('Results imports cleanly', async () => {
        const mod = await import('../pages/Results')
        expect(mod.default).toBeDefined()
    })

    it('FilingInstructions imports cleanly', async () => {
        const mod = await import('../pages/FilingInstructions')
        expect(mod.default).toBeDefined()
    })

    it('TaxAdvisor imports cleanly', async () => {
        const mod = await import('../pages/TaxAdvisor')
        expect(mod.default).toBeDefined()
    })

    it('SteuerbescheidReader imports cleanly', async () => {
        const mod = await import('../pages/SteuerbescheidReader')
        expect(mod.default).toBeDefined()
    })

    it('AdminPanel imports cleanly', async () => {
        const mod = await import('../pages/AdminPanel')
        expect(mod.default).toBeDefined()
    })
})
