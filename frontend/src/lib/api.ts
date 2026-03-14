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

// ── Tax ────────────────────────────────────────────────────────────────────

export async function fetchActiveParameters(): Promise<TaxYearParameters> {
    const { data } = await api.get<TaxYearParameters>('/tax/parameters/active')
    return data
}

// ── Admin: Auth ────────────────────────────────────────────────────────────

export async function adminLogin(password: string): Promise<string> {
    const { data } = await api.post<{ access_token: string; token_type: string }>(
        '/admin/login',
        { password },
    )
    return data.access_token
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/admin/password', { current_password: currentPassword, new_password: newPassword })
}

// ── Admin: Parameters ──────────────────────────────────────────────────────

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

export async function deleteYear(year: number): Promise<void> {
    await api.delete(`/admin/parameters/${year}`)
}

// ── Admin: Health & Settings ───────────────────────────────────────────────

export interface AdminHealth {
    database: { status: string; active_year: number | null; year_count: number }
    ollama: { status: string; model: string; enabled: boolean; base_url: string }
}

export async function fetchAdminHealth(): Promise<AdminHealth> {
    const { data } = await api.get<AdminHealth>('/admin/health')
    return data
}

export interface AdminSettings {
    ollama_model: string
    ollama_enabled: boolean
    ollama_base_url: string
    ollama_timeout: number
}

export async function fetchAdminSettings(): Promise<AdminSettings> {
    const { data } = await api.get<AdminSettings>('/admin/settings')
    return data
}

export async function updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    const { data } = await api.put<AdminSettings>('/admin/settings', updates)
    return data
}

// ── AI ─────────────────────────────────────────────────────────────────────

export interface OllamaModel {
    name: string
    size: number
    modified_at: string
    details?: { parameter_size?: string; family?: string }
}

export interface AiStatus {
    available: boolean
    model: string
    base_url: string
}

export async function fetchAiStatus(): Promise<AiStatus> {
    const { data } = await api.get<AiStatus>('/ai/status')
    return data
}

export async function fetchAiModels(): Promise<OllamaModel[]> {
    const { data } = await api.get<{ models: OllamaModel[] }>('/ai/models')
    return data.models
}

// ── Admin: Audit Log ───────────────────────────────────────────────────────

export interface AuditLogEntry {
    id: number
    timestamp: string
    action: string
    target: string | null
    old_value: string | null
    new_value: string | null
}

export async function fetchAuditLog(limit = 50): Promise<AuditLogEntry[]> {
    const { data } = await api.get<AuditLogEntry[]>('/admin/audit-log', { params: { limit } })
    return data
}

export default api

