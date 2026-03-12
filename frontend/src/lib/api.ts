import axios from 'axios'
import type { AdminToken, TaxYearParameters } from '../types/tax'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const api = axios.create({ baseURL: BASE_URL })

// Attach JWT for admin requests
export function setAdminToken(token: string | null) {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
        delete api.defaults.headers.common['Authorization']
    }
}

// ── Tax parameters ─────────────────────────────────────────────────────────
export async function fetchActiveParameters(): Promise<TaxYearParameters> {
    const { data } = await api.get<TaxYearParameters>('/api/tax/parameters/active')
    return data
}

export async function fetchParametersByYear(year: number): Promise<TaxYearParameters> {
    const { data } = await api.get<TaxYearParameters>(`/api/tax/parameters/${year}`)
    return data
}

// ── AI features ────────────────────────────────────────────────────────────
export async function checkAiStatus(): Promise<{ available: boolean; model: string }> {
    const { data } = await api.get('/api/ai/status')
    return data
}

export async function categorizeExpense(description: string) {
    const { data } = await api.post('/api/ai/categorize-expense', { description })
    return data
}

export async function explainTerm(term: string): Promise<{ term: string; explanation: string }> {
    const { data } = await api.get(`/api/ai/explain/${encodeURIComponent(term)}`)
    return data
}

// ── Admin ──────────────────────────────────────────────────────────────────
export async function adminLogin(password: string): Promise<AdminToken> {
    const { data } = await api.post<AdminToken>('/api/admin/login', { password })
    return data
}

export async function adminListParameters(): Promise<TaxYearParameters[]> {
    const { data } = await api.get<TaxYearParameters[]>('/api/admin/parameters')
    return data
}

export async function adminUpdateParameters(year: number, updates: Partial<TaxYearParameters>): Promise<TaxYearParameters> {
    const { data } = await api.put<TaxYearParameters>(`/api/admin/parameters/${year}`, updates)
    return data
}

export async function adminActivateYear(year: number): Promise<TaxYearParameters> {
    const { data } = await api.post<TaxYearParameters>(`/api/admin/parameters/${year}/activate`)
    return data
}

export async function adminCopyYear(fromYear: number, toYear: number): Promise<TaxYearParameters> {
    const { data } = await api.post<TaxYearParameters>(`/api/admin/parameters/${fromYear}/copy-to/${toYear}`)
    return data
}

export async function adminCreateParameters(payload: Omit<TaxYearParameters, 'is_active'> & { is_active?: boolean }): Promise<TaxYearParameters> {
    const { data } = await api.post<TaxYearParameters>('/api/admin/parameters', payload)
    return data
}
