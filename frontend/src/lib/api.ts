import axios from 'axios'
import { TaxYearParameters } from '../types/tax'

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
})

let adminToken: string | null = null

export function setAdminToken(token: string | null) {
    adminToken = token
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
        delete api.defaults.headers.common['Authorization']
    }
}

export function getAdminToken() {
    return adminToken
}

export async function fetchActiveParameters(): Promise<TaxYearParameters> {
    const { data } = await api.get<TaxYearParameters>('/tax/parameters/active')
    return data
}

export async function adminLogin(password: string): Promise<string> {
    const { data } = await api.post<{ access_token: string; token_type: string }>(
        '/admin/login',
        { password },
    )
    return data.access_token
}

export async function fetchAllParameters(): Promise<TaxYearParameters[]> {
    const { data } = await api.get<TaxYearParameters[]>('/admin/parameters')
    return data
}

export async function updateParameters(
    year: number,
    updates: Partial<TaxYearParameters>,
): Promise<TaxYearParameters> {
    const { data } = await api.put<TaxYearParameters>(`/admin/parameters/${year}`, updates)
    return data
}

export async function activateYear(year: number): Promise<TaxYearParameters> {
    const { data } = await api.post<TaxYearParameters>(`/admin/parameters/${year}/activate`)
    return data
}

export async function copyYear(
    sourceYear: number,
    targetYear: number,
): Promise<TaxYearParameters> {
    const { data } = await api.post<TaxYearParameters>(
        `/admin/parameters/${sourceYear}/copy-to/${targetYear}`,
    )
    return data
}

export default api
