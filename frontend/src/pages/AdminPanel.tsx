import {
    Activity,
    Bot,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Database,
    KeyRound,
    LogOut,
    Pencil,
    PlusCircle,
    RefreshCw,
    Save,
    Settings2,
    Shield,
    Trash2,
    XCircle,
    Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import {
    AdminHealth,
    AdminSettings,
    AuditLogEntry,
    OllamaModel,
    activateYear,
    adminLogin,
    changeAdminPassword,
    copyYear,
    deleteYear,
    fetchAdminHealth,
    fetchAdminSettings,
    fetchAiModels,
    fetchAllParameters,
    fetchAuditLog,
    setAdminToken,
    updateAdminSettings,
    updateParameters,
} from '../lib/api'
import { TaxYearParameters } from '../types/tax'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return n.toLocaleString('de-DE', { maximumFractionDigits: 4 })
}

function fmtBytes(bytes: number) {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
    return `${bytes} B`
}

type Tab = 'dashboard' | 'parameters' | 'ai' | 'security'

// ─── Parameter categories ────────────────────────────────────────────────────

const PARAM_SECTIONS: Array<{
    title: string
    description: string
    fields: Array<{ key: keyof TaxYearParameters; label: string; unit?: string; isInt?: boolean }>
}> = [
        {
            title: '§32a Tax Zones',
            description: 'Income brackets defining the five progressive tax rate zones.',
            fields: [
                { key: 'grundfreibetrag', label: 'Grundfreibetrag (Zone 1 limit)', unit: '€' },
                { key: 'zone2_limit', label: 'Zone 2 upper limit', unit: '€' },
                { key: 'zone3_limit', label: 'Zone 3 upper limit (42% begins)', unit: '€' },
                { key: 'zone4_limit', label: 'Zone 4 upper limit (45% begins)', unit: '€' },
            ],
        },
        {
            title: '§32a Zone Coefficients',
            description: 'Precise formula coefficients as published annually by BMF.',
            fields: [
                { key: 'zone2_coeff1', label: 'Zone 2 coeff1' },
                { key: 'zone2_coeff2', label: 'Zone 2 coeff2' },
                { key: 'zone3_coeff1', label: 'Zone 3 coeff1' },
                { key: 'zone3_coeff2', label: 'Zone 3 coeff2' },
                { key: 'zone3_offset', label: 'Zone 3 addend', unit: '€' },
                { key: 'zone4_rate', label: 'Zone 4 flat rate', unit: '%' },
                { key: 'zone4_offset', label: 'Zone 4 deduction', unit: '€' },
                { key: 'zone5_rate', label: 'Zone 5 flat rate (Reichensteuer)', unit: '%' },
                { key: 'zone5_offset', label: 'Zone 5 deduction', unit: '€' },
            ],
        },
        {
            title: 'Pauschalbeträge & Allowances',
            description: 'Standard flat-rate deductions applied when actual costs are below the minimum.',
            fields: [
                { key: 'werbungskosten_pauschale', label: 'Werbungskosten Pauschale (§9a EStG)', unit: '€' },
                { key: 'sonderausgaben_pauschale_single', label: 'Sonderausgaben Pauschale — single (§10c)', unit: '€' },
                { key: 'sonderausgaben_pauschale_joint', label: 'Sonderausgaben Pauschale — joint (§10c)', unit: '€' },
                { key: 'sparer_pauschbetrag', label: 'Sparer-Pauschbetrag (§20 EStG)', unit: '€' },
            ],
        },
        {
            title: 'Work Deduction Rates',
            description: 'Per-unit rates for commuting and home office deductions.',
            fields: [
                { key: 'pendlerpauschale_per_km', label: 'Pendlerpauschale per km (one way)', unit: '€/km' },
                { key: 'homeoffice_per_day', label: 'Homeoffice-Pauschale per day', unit: '€/day' },
                { key: 'homeoffice_max_days', label: 'Homeoffice max claimable days', unit: 'days', isInt: true },
            ],
        },
        {
            title: 'Children & Kindergeld',
            description: 'Family-related allowances — Günstigerprüfung compares Kindergeld vs Kinderfreibetrag.',
            fields: [
                { key: 'kindergeld_per_month', label: 'Kindergeld per child per month', unit: '€/month' },
                { key: 'kinderfreibetrag', label: 'Kinderfreibetrag per child (§32 EStG)', unit: '€' },
                { key: 'childcare_rate', label: 'Childcare deduction rate (§10 EStG)', unit: '%' },
                { key: 'childcare_max_per_child', label: 'Childcare max per child', unit: '€' },
            ],
        },
        {
            title: 'Solidarity Surcharge (SolZG)',
            description: 'Soli rates and income thresholds above which Soli applies.',
            fields: [
                { key: 'soli_rate', label: 'Soli rate', unit: '%' },
                { key: 'soli_freigrenze_single', label: 'Soli Freigrenze — single', unit: '€' },
                { key: 'soli_freigrenze_joint', label: 'Soli Freigrenze — joint', unit: '€' },
            ],
        },
        {
            title: 'Church Tax (Kirchensteuer)',
            description: 'Church tax rates applied as a percentage of income tax due.',
            fields: [
                { key: 'kirchensteuer_rate_high', label: 'Rate — most states (9%)', unit: '%' },
                { key: 'kirchensteuer_rate_low', label: 'Rate — Bavaria / BW (8%)', unit: '%' },
            ],
        },
        {
            title: 'Special Expenses Caps (§10 EStG)',
            description: 'Maximum deductible amounts for specific expense categories.',
            fields: [
                { key: 'max_pension_deduction_single', label: 'Pension contributions max — single', unit: '€' },
                { key: 'max_pension_deduction_joint', label: 'Pension contributions max — joint', unit: '€' },
                { key: 'alimony_max', label: 'Alimony deduction cap (Realsplitting)', unit: '€' },
                { key: 'ehrenamt_allowance', label: 'Ehrenamt allowance (§3 Nr.26a)', unit: '€' },
                { key: 'uebungsleiter_allowance', label: 'Übungsleiter allowance (§3 Nr.26)', unit: '€' },
            ],
        },
    ]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
        >
            {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {label}
        </span>
    )
}

function ParamField({
    label,
    value,
    unit,
    isInt,
    onSave,
}: {
    label: string
    value: number
    unit?: string
    isInt?: boolean
    onSave: (v: number) => void
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(String(value))

    function save() {
        const parsed = isInt ? parseInt(draft, 10) : parseFloat(draft)
        if (!isNaN(parsed)) {
            onSave(parsed)
        }
        setEditing(false)
    }

    const displayValue = unit === '%' ? `${(value * 100).toFixed(2)}%` : fmt(value) + (unit ? ` ${unit}` : '')

    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-400 leading-tight">{label}</p>
            {editing ? (
                <div className="flex gap-1 items-center">
                    <input
                        autoFocus
                        type="number"
                        step="any"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="border border-brand-400 rounded px-1.5 py-0.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') save()
                            if (e.key === 'Escape') setEditing(false)
                        }}
                    />
                    <button onClick={save} className="text-green-600 hover:text-green-700" title="Save">
                        <CheckCircle size={14} />
                    </button>
                    <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600" title="Cancel">
                        <XCircle size={14} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => { setDraft(String(value)); setEditing(true) }}
                    className="group flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-brand-600 hover:bg-brand-50 rounded px-1.5 py-0.5 -ml-1.5 text-left transition-colors"
                    title="Click to edit"
                >
                    {displayValue}
                    <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </button>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPanel() {
    const [password, setPassword] = useState('')
    const [loggedIn, setLoggedIn] = useState(false)
    const [loginError, setLoginError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<Tab>('dashboard')

    // Dashboard state
    const [health, setHealth] = useState<AdminHealth | null>(null)
    const [healthLoading, setHealthLoading] = useState(false)
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])

    // Parameters state
    const [params, setParams] = useState<TaxYearParameters[]>([])
    const [copySource, setCopySource] = useState<number | null>(null)
    const [copyTarget, setCopyTarget] = useState('')
    const [expandedYear, setExpandedYear] = useState<number | null>(null)
    const [paramsError, setParamsError] = useState<string | null>(null)

    // AI Settings state
    const [aiSettings, setAiSettings] = useState<AdminSettings | null>(null)
    const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
    const [pendingModel, setPendingModel] = useState('')
    const [aiSaving, setAiSaving] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)
    const [aiSuccess, setAiSuccess] = useState('')

    // Security state
    const [currentPw, setCurrentPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [pwError, setPwError] = useState<string | null>(null)
    const [pwSuccess, setPwSuccess] = useState('')

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoginError(null)
        try {
            const token = await adminLogin(password)
            setAdminToken(token)
            setLoggedIn(true)
            // Load all data after login
            await Promise.all([loadDashboard(), loadParams(), loadAiSettings()])
        } catch {
            setLoginError('Invalid password')
        }
    }

    async function loadDashboard() {
        setHealthLoading(true)
        try {
            const [h, log] = await Promise.all([fetchAdminHealth(), fetchAuditLog(20)])
            setHealth(h)
            setAuditLog(log)
        } catch {
            setHealth(null)
        } finally {
            setHealthLoading(false)
        }
    }

    async function loadParams() {
        try {
            const data = await fetchAllParameters()
            const sorted = data.sort((a, b) => b.year - a.year)
            setParams(sorted)
            // Auto-expand the active year (or most recent year if none active)
            if (expandedYear === null) {
                const active = sorted.find((p) => p.is_active) ?? sorted[0]
                if (active) setExpandedYear(active.year)
            }
        } catch {
            setParamsError('Failed to load parameters')
        }
    }

    async function loadAiSettings() {
        try {
            const [settings, models] = await Promise.all([fetchAdminSettings(), fetchAiModels()])
            setAiSettings(settings)
            setAvailableModels(models)
            setPendingModel(settings.ollama_model)
        } catch {
            setAiError('Could not load AI settings')
        }
    }

    async function handleActivate(year: number) {
        try {
            const updated = await activateYear(year)
            setParams((prev) => prev.map((p) => ({ ...p, is_active: p.year === updated.year })))
            await loadDashboard()
        } catch (err: unknown) {
            setParamsError(err instanceof Error ? err.message : 'Activation failed')
        }
    }

    async function handleCopy(sourceYear: number) {
        const target = parseInt(copyTarget)
        if (!target || isNaN(target) || target < 2020 || target > 2050) {
            setParamsError('Enter a valid year between 2020 and 2050')
            return
        }
        try {
            const newParams = await copyYear(sourceYear, target)
            setParams((prev) => [...prev, newParams].sort((a, b) => b.year - a.year))
            setCopyTarget('')
            setCopySource(null)
            setExpandedYear(newParams.year)
        } catch {
            setParamsError(`Year ${target} already exists or source not found`)
        }
    }

    async function handleDelete(year: number) {
        if (!window.confirm(`Permanently delete tax year ${year}? This cannot be undone.`)) return
        try {
            await deleteYear(year)
            setParams((prev) => prev.filter((p) => p.year !== year))
            if (expandedYear === year) setExpandedYear(null)
        } catch (err: unknown) {
            setParamsError(err instanceof Error ? err.message : 'Delete failed')
        }
    }

    async function handleUpdate(year: number, field: keyof TaxYearParameters, value: number) {
        try {
            const updated = await updateParameters(year, { [field]: value })
            setParams((prev) => prev.map((p) => (p.year === year ? updated : p)))
        } catch {
            setParamsError('Failed to save parameter')
        }
    }

    async function handleSaveModel() {
        if (!pendingModel.trim()) return
        setAiSaving(true)
        setAiError(null)
        setAiSuccess('')
        try {
            const updated = await updateAdminSettings({ ollama_model: pendingModel.trim() })
            setAiSettings(updated)
            setAiSuccess(`Model switched to ${updated.ollama_model}`)
        } catch (err: unknown) {
            setAiError(err instanceof Error ? err.message : 'Failed to update model')
        } finally {
            setAiSaving(false)
        }
    }

    async function handleToggleOllama() {
        if (!aiSettings) return
        try {
            const updated = await updateAdminSettings({ ollama_enabled: !aiSettings.ollama_enabled })
            setAiSettings(updated)
        } catch {
            setAiError('Failed to toggle AI')
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        setPwError(null)
        setPwSuccess('')
        if (newPw !== confirmPw) { setPwError('New passwords do not match'); return }
        if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return }
        try {
            await changeAdminPassword(currentPw, newPw)
            setPwSuccess('Password changed successfully')
            setCurrentPw(''); setNewPw(''); setConfirmPw('')
        } catch {
            setPwError('Current password is incorrect')
        }
    }

    function handleLogout() {
        setLoggedIn(false)
        setAdminToken(null)
        setPassword('')
        setHealth(null)
        setParams([])
        setAiSettings(null)
    }

    // ── Login screen ──────────────────────────────────────────────────────────

    if (!loggedIn) {
        return (
            <div className="max-w-sm mx-auto mt-16">
                <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-200 dark:border-white/5 p-8 shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-brand-100 rounded-xl p-2.5">
                            <Shield size={22} className="text-brand-700" />
                        </div>
                        <div>
                            <h1 className="font-heading font-bold text-xl text-gray-800 dark:text-slate-100">Admin Panel</h1>
                            <p className="text-xs text-gray-400 dark:text-slate-500">SmartTax Germany</p>
                        </div>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                                autoFocus
                                placeholder="Enter admin password"
                            />
                        </div>
                        {loginError && <p className="text-sm text-red-600">{loginError}</p>}
                        <button
                            type="submit"
                            className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                        >
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    // ── Logged-in layout ──────────────────────────────────────────────────────

    const TABS: Array<{ id: Tab; icon: React.ReactNode; label: string }> = [
        { id: 'dashboard', icon: <Activity size={15} />, label: 'Dashboard' },
        { id: 'parameters', icon: <Database size={15} />, label: 'Tax Parameters' },
        { id: 'ai', icon: <Bot size={15} />, label: 'AI Settings' },
        { id: 'security', icon: <KeyRound size={15} />, label: 'Security' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-100 rounded-xl p-2">
                        <Shield size={20} className="text-brand-700" />
                    </div>
                    <div>
                        <h1 className="font-heading font-bold text-2xl text-gray-900 dark:text-slate-100">Admin Panel</h1>
                        <p className="text-sm text-gray-400">SmartTax Germany — system configuration</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 transition-colors"
                >
                    <LogOut size={14} />
                    Logout
                </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-200 gap-1">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id
                            ? 'border-brand-600 text-brand-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Dashboard Tab ─────────────────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">System Status</h2>
                        <button
                            onClick={loadDashboard}
                            disabled={healthLoading}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={healthLoading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {health ? (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* DB card */}
                            <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-blue-50 rounded-lg p-2">
                                        <Database size={18} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">Database</p>
                                        <StatusBadge ok={health.database.status === 'ok'} label={health.database.status} />
                                    </div>
                                </div>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <dt className="text-gray-400">Active year</dt>
                                        <dd className="font-medium">{health.database.active_year ?? '—'}</dd>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <dt className="text-gray-400">Years loaded</dt>
                                        <dd className="font-medium">{health.database.year_count}</dd>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <dt className="text-gray-400">Engine</dt>
                                        <dd className="font-medium">SQLite</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Ollama card */}
                            <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-purple-50 rounded-lg p-2">
                                        <Bot size={18} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">Ollama AI</p>
                                        <StatusBadge ok={health.ollama.status === 'ok'} label={health.ollama.status} />
                                    </div>
                                </div>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <dt className="text-gray-400">Current model</dt>
                                        <dd className="font-medium font-mono text-xs">{health.ollama.model}</dd>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <dt className="text-gray-400">Enabled</dt>
                                        <dd className="font-medium">{health.ollama.enabled ? 'Yes' : 'No'}</dd>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <dt className="text-gray-400">Endpoint</dt>
                                        <dd className="font-medium font-mono text-xs truncate max-w-[160px]">{health.ollama.base_url}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Quick actions */}
                            <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none sm:col-span-2">
                                <p className="font-semibold text-gray-800 mb-3">Quick Actions</p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setActiveTab('parameters')}
                                        className="flex items-center gap-1.5 text-sm border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Database size={13} />
                                        Manage Tax Years
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('ai')}
                                        className="flex items-center gap-1.5 text-sm border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Bot size={13} />
                                        Configure AI Model
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        className="flex items-center gap-1.5 text-sm border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <KeyRound size={13} />
                                        Change Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : healthLoading ? (
                        <div className="flex items-center gap-2 text-gray-400">
                            <RefreshCw size={16} className="animate-spin" />
                            Loading system status…
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                            Could not load health data. Ensure the backend is running.
                        </div>
                    )}

                    {/* Audit Log */}
                    <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                        <p className="font-semibold text-gray-800 mb-3">Recent Admin Activity</p>
                        {auditLog.length === 0 ? (
                            <p className="text-sm text-gray-400">No activity recorded yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400">
                                            <th className="pb-2 pr-3 font-medium">Time</th>
                                            <th className="pb-2 pr-3 font-medium">Action</th>
                                            <th className="pb-2 pr-3 font-medium">Target</th>
                                            <th className="pb-2 pr-3 font-medium">Old</th>
                                            <th className="pb-2 font-medium">New</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {auditLog.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-gray-50">
                                                <td className="py-1.5 pr-3 text-gray-400 whitespace-nowrap">
                                                    {new Date(entry.timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="py-1.5 pr-3">
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                                        {entry.action}
                                                    </span>
                                                </td>
                                                <td className="py-1.5 pr-3 text-gray-500 truncate max-w-[120px]">{entry.target ?? '—'}</td>
                                                <td className="py-1.5 pr-3 text-red-500 font-mono truncate max-w-[80px]">{entry.old_value ?? '—'}</td>
                                                <td className="py-1.5 text-green-600 font-mono truncate max-w-[80px]">{entry.new_value ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Parameters Tab ────────────────────────────────────────────────────── */}
            {activeTab === 'parameters' && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">Tax Year Parameters</h2>
                        <button
                            onClick={loadParams}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
                        >
                            <RefreshCw size={14} />
                            Reload
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-4 py-2.5 text-sm text-brand-700">
                        <Pencil size={13} className="shrink-0" />
                        <span>Click any value below to edit it. Press <kbd className="bg-white border border-brand-200 rounded px-1 text-xs">Enter</kbd> to save or <kbd className="bg-white border border-brand-200 rounded px-1 text-xs">Esc</kbd> to cancel.</span>
                    </div>

                    {paramsError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center justify-between">
                            {paramsError}
                            <button onClick={() => setParamsError(null)} className="text-red-400 hover:text-red-600">
                                <XCircle size={14} />
                            </button>
                        </div>
                    )}

                    {params.map((p) => (
                        <div key={p.year} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Year header */}
                            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setExpandedYear(expandedYear === p.year ? null : p.year)}
                                        className="flex items-center gap-2 font-semibold text-gray-800 hover:text-brand-700 transition-colors"
                                    >
                                        {expandedYear === p.year ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        {p.year}
                                    </button>
                                    {p.is_active && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                            <Zap size={10} />
                                            Active
                                        </span>
                                    )}
                                    {p.notes && (
                                        <span className="text-xs text-gray-400 italic truncate max-w-[200px]">{p.notes}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Copy to another year */}
                                    {copySource === p.year ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                placeholder="Target year"
                                                value={copyTarget}
                                                onChange={(e) => setCopyTarget(e.target.value)}
                                                className="border border-gray-300 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-brand-400"
                                                onKeyDown={(e) => e.key === 'Enter' && handleCopy(p.year)}
                                            />
                                            <button
                                                onClick={() => handleCopy(p.year)}
                                                className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
                                            >
                                                Copy
                                            </button>
                                            <button
                                                onClick={() => { setCopySource(null); setCopyTarget('') }}
                                                className="text-xs text-gray-400 hover:text-gray-600"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setCopySource(p.year); setCopyTarget('') }}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                                        >
                                            <PlusCircle size={12} />
                                            Copy to…
                                        </button>
                                    )}
                                    {!p.is_active && (
                                        <button
                                            onClick={() => handleActivate(p.year)}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                        >
                                            <Zap size={12} />
                                            Activate
                                        </button>
                                    )}
                                    {!p.is_active && (
                                        <button
                                            onClick={() => handleDelete(p.year)}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                                            title="Delete this year"
                                        >
                                            <Trash2 size={12} />
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded parameter sections */}
                            {expandedYear === p.year && (
                                <div className="divide-y divide-gray-100">
                                    {PARAM_SECTIONS.map((section) => (
                                        <div key={section.title} className="px-5 py-4">
                                            <div className="mb-3">
                                                <p className="text-sm font-semibold text-gray-700">{section.title}</p>
                                                <p className="text-xs text-gray-400 dark:text-slate-500">{section.description}</p>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {section.fields.map(({ key, label, unit, isInt }) => (
                                                    <ParamField
                                                        key={String(key)}
                                                        label={label}
                                                        value={p[key] as number}
                                                        unit={unit}
                                                        isInt={isInt}
                                                        onSave={(v) => handleUpdate(p.year, key, v)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Notes field */}
                                    <div className="px-5 py-3 flex items-center gap-3 border-t border-gray-100">
                                        <span className="text-xs text-gray-400 font-medium w-12 shrink-0">Notes</span>
                                        <NotesField
                                            value={p.notes ?? ''}
                                            onSave={async (v) => {
                                                const updated = await updateParameters(p.year, { notes: v })
                                                setParams((prev) => prev.map((x) => (x.year === p.year ? updated : x)))
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── AI Settings Tab ──────────────────────────────────────────────────────*/}
            {activeTab === 'ai' && (
                <div className="space-y-5 max-w-2xl">
                    <h2 className="text-lg font-semibold text-gray-800">AI Model Configuration</h2>

                    {aiError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex justify-between items-center">
                            {aiError}
                            <button onClick={() => setAiError(null)}><XCircle size={14} /></button>
                        </div>
                    )}
                    {aiSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2 flex justify-between items-center">
                            {aiSuccess}
                            <button onClick={() => setAiSuccess('')}><XCircle size={14} /></button>
                        </div>
                    )}

                    {aiSettings && (
                        <>
                            {/* Toggle */}
                            <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-800">AI Features</p>
                                        <p className="text-sm text-gray-400">Enable or disable all Ollama-powered features</p>
                                    </div>
                                    <button
                                        onClick={handleToggleOllama}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiSettings.ollama_enabled ? 'bg-brand-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${aiSettings.ollama_enabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Model picker */}
                            <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none space-y-4">
                                <div>
                                    <p className="font-semibold text-gray-800 mb-1">Active Model</p>
                                    <p className="text-sm text-gray-400">
                                        Current: <span className="font-mono font-medium text-gray-700">{aiSettings.ollama_model}</span>
                                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">in memory — restart to persist</span>
                                    </p>
                                </div>

                                {availableModels.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Available locally ({availableModels.length} models)
                                        </p>
                                        <div className="grid gap-2">
                                            {availableModels.map((m) => (
                                                <label
                                                    key={m.name}
                                                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${pendingModel === m.name
                                                        ? 'border-brand-400 bg-brand-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="model"
                                                            value={m.name}
                                                            checked={pendingModel === m.name}
                                                            onChange={() => setPendingModel(m.name)}
                                                            className="accent-brand-600"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium font-mono text-gray-800">{m.name}</p>
                                                            {m.details?.parameter_size && (
                                                                <p className="text-xs text-gray-400 dark:text-slate-500">{m.details.parameter_size} · {m.details.family ?? ''}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400 shrink-0">{fmtBytes(m.size)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">No local models detected. Enter model name manually:</p>
                                        <input
                                            type="text"
                                            value={pendingModel}
                                            onChange={(e) => setPendingModel(e.target.value)}
                                            placeholder="e.g. qwen3:latest"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveModel}
                                    disabled={aiSaving || pendingModel === aiSettings.ollama_model}
                                    className="flex items-center gap-2 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                                >
                                    {aiSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Apply Model
                                </button>
                            </div>

                            {/* Connection info */}
                            <div className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none">
                                <p className="font-semibold text-gray-800 mb-3">Connection</p>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-gray-400">Ollama base URL</dt>
                                        <dd className="font-mono text-gray-700">{aiSettings.ollama_base_url}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-400">Request timeout</dt>
                                        <dd className="text-gray-700">{aiSettings.ollama_timeout}s</dd>
                                    </div>
                                </dl>
                                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                                    <p>To permanently change model: update <code className="bg-gray-100 px-1 rounded">OLLAMA_MODEL</code> in <code className="bg-gray-100 px-1 rounded">backend/.env</code> and restart the server.</p>
                                    <p>Changes made here are in-memory and reset on server restart.</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Security Tab ─────────────────────────────────────────────────────── */}
            {activeTab === 'security' && (
                <div className="space-y-5 max-w-md">
                    <h2 className="text-lg font-semibold text-gray-800">Security Settings</h2>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <KeyRound size={18} className="text-brand-600" />
                            <h3 className="font-semibold text-gray-800">Change Admin Password</h3>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                                <input
                                    type="password"
                                    value={currentPw}
                                    onChange={(e) => setCurrentPw(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                                <input
                                    type="password"
                                    value={newPw}
                                    onChange={(e) => setNewPw(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                    minLength={8}
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                                <input
                                    type="password"
                                    value={confirmPw}
                                    onChange={(e) => setConfirmPw(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                    required
                                />
                            </div>
                            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                            {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}
                            <button
                                type="submit"
                                className="flex items-center gap-2 w-full justify-center py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                            >
                                <Save size={14} />
                                Update Password
                            </button>
                        </form>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1.5">
                        <p className="font-semibold flex items-center gap-1.5">
                            <Settings2 size={14} />
                            Security Checklist
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Change the default password before deploying publicly</li>
                            <li>Set a strong <code className="bg-amber-100 px-1 rounded">ADMIN_SECRET_KEY</code> in <code className="bg-amber-100 px-1 rounded">.env</code> (min 32 random chars)</li>
                            <li>Use HTTPS when running outside localhost</li>
                            <li>The JWT token expires in 8 hours — re-login to refresh</li>
                            <li>No user PII is stored server-side — only tax parameters</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Notes inline editor ─────────────────────────────────────────────────────

function NotesField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    return editing ? (
        <div className="flex gap-2 flex-1">
            <input
                autoFocus
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 border border-brand-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { onSave(draft); setEditing(false) }
                    if (e.key === 'Escape') setEditing(false)
                }}
                maxLength={200}
            />
            <button onClick={() => { onSave(draft); setEditing(false) }} className="text-green-600 hover:text-green-700"><CheckCircle size={14} /></button>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={14} /></button>
        </div>
    ) : (
        <button
            onClick={() => { setDraft(value); setEditing(true) }}
            className="text-xs text-gray-500 hover:text-brand-600 text-left transition-colors italic"
        >
            {value || 'Add a note…'}
        </button>
    )
}

