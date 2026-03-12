import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Copy, LogIn, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import {
    adminActivateYear,
    adminCopyYear,
    adminListParameters,
    adminLogin,
    adminUpdateParameters,
    setAdminToken,
} from '../lib/api'
import { formatEuro } from '../lib/utils'
import { TaxYearParameters } from '../types/tax'

const TOKEN_KEY = 'smarttax_admin_token'

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { access_token } = await adminLogin(password)
            setAdminToken(access_token)
            localStorage.setItem(TOKEN_KEY, access_token)
            onLogin(access_token)
        } catch {
            setError('Invalid password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm">
                <div className="card p-8">
                    <div className="text-center mb-6">
                        <div className="inline-flex w-14 h-14 bg-brand-500 text-white rounded-2xl items-center justify-center mb-3">
                            <Settings size={26} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
                        <p className="text-sm text-slate-500 mt-1">SmartTax Germany — Parameter Management</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Admin Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="Enter admin password"
                                required
                                autoFocus
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full justify-center"
                        >
                            <LogIn size={16} />
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

// ─── Parameter Edit Form ───────────────────────────────────────────────────────

type EditState = Partial<TaxYearParameters>

const FieldGroup = ({
    title,
    fields,
    editState,
    onChange,
}: {
    title: string
    fields: { key: keyof TaxYearParameters; label: string; unit?: string }[]
    editState: EditState
    onChange: (key: keyof TaxYearParameters, value: number | string) => void
}) => {
    const [expanded, setExpanded] = useState(true)

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <span className="font-semibold text-slate-700 text-sm">{title}</span>
                {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {expanded && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fields.map(({ key, label, unit }) => (
                        <div key={key as string}>
                            <label className="label text-xs">{label}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="any"
                                    value={editState[key] as number ?? ''}
                                    onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
                                    className="input-field text-sm pr-10"
                                />
                                {unit && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                                        {unit}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main Admin Panel ──────────────────────────────────────────────────────────

export default function AdminPanel() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
    const [params, setParams] = useState<TaxYearParameters[]>([])
    const [selectedYear, setSelectedYear] = useState<number | null>(null)
    const [editState, setEditState] = useState<EditState>({})
    const [copyToYear, setCopyToYear] = useState('')
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const loadParams = async () => {
        setLoading(true)
        try {
            const data = await adminListParameters()
            setParams(data)
            if (data.length > 0 && !selectedYear) {
                setSelectedYear(data[0].year)
            }
        } catch {
            setError('Failed to load parameters. Your session may have expired.')
            setAdminToken(null)
            setToken(null)
            localStorage.removeItem(TOKEN_KEY)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (token) {
            setAdminToken(token)
            loadParams()
        }
    }, [token]) // eslint-disable-line

    useEffect(() => {
        if (selectedYear) {
            const p = params.find((x) => x.year === selectedYear)
            if (p) setEditState({ ...p })
        }
    }, [selectedYear, params])

    const handleFieldChange = (key: keyof TaxYearParameters, value: number | string) => {
        setEditState((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        if (!token || !selectedYear) return
        setSaving(true)
        setError('')
        setSuccess('')
        try {
            await adminUpdateParameters(selectedYear, editState as Partial<TaxYearParameters>)
            setSuccess('Parameters saved successfully.')
            await loadParams(token)
        } catch {
            setError('Failed to save parameters.')
        } finally {
            setSaving(false)
        }
    }

    const handleActivate = async (year: number) => {
        try {
            await adminActivateYear(year)
            setSuccess(`Tax year ${year} is now active.`)
            await loadParams(token)
        } catch {
            setError('Failed to activate year.')
        }
    }

    const handleCopy = async () => {
        if (!selectedYear || !copyToYear) return
        const newYear = parseInt(copyToYear)
        if (isNaN(newYear) || newYear < 2020 || newYear > 2040) {
            setError('Enter a valid year (e.g. 2027).')
            return
        }
        try {
            await adminCopyYear(selectedYear, newYear)
            setSuccess(`Parameters copied from ${selectedYear} to ${newYear}. Switch to it and update the values.`)
            setCopyToYear('')
            await loadParams(token)
        } catch {
            setError('Failed to copy year. It may already exist.')
        }
    }

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setParams([])
    }

    if (!token) return <Layout><LoginScreen onLogin={setToken} /></Layout>

    const selected = params.find((p) => p.year === selectedYear)

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 py-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-brand-500">Parameter Administration</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Manage annual tax parameters for all filing years</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                        >
                            Log out
                        </button>
                    </div>

                    {/* Alerts */}
                    {success && (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-sm">
                            <CheckCircle size={16} />
                            {success}
                            <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">✕</button>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-sm">
                            <AlertCircle size={16} />
                            {error}
                            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-20 text-slate-400">Loading parameters…</div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Year list sidebar */}
                            <div className="lg:col-span-1">
                                <div className="card p-4">
                                    <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Tax Years</h2>
                                    <div className="space-y-1">
                                        {params.map((p) => (
                                            <button
                                                key={p.year}
                                                onClick={() => setSelectedYear(p.year)}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm flex items-center justify-between ${selectedYear === p.year
                                                    ? 'bg-brand-500 text-white font-semibold'
                                                    : 'text-slate-700 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <span>{p.year}</span>
                                                {p.is_active && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${selectedYear === p.year
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        Active
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Copy year */}
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <p className="text-xs text-slate-500 mb-2">Copy selected year to new year:</p>
                                        <div className="flex gap-1.5">
                                            <input
                                                type="number"
                                                value={copyToYear}
                                                onChange={(e) => setCopyToYear(e.target.value)}
                                                placeholder="e.g. 2027"
                                                className="input-field text-sm py-1.5 flex-1 min-w-0"
                                            />
                                            <button
                                                onClick={handleCopy}
                                                className="px-2 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                                                title="Copy year"
                                            >
                                                <Copy size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Edit panel */}
                            {selected && (
                                <div className="lg:col-span-3">
                                    <div className="card p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-lg font-semibold text-slate-800">
                                                    Parameters for Tax Year {selected.year}
                                                    <span className="text-sm font-normal text-slate-500 ml-2">
                                                        (filing for {selected.year - 1} income)
                                                    </span>
                                                </h2>
                                                {selected.notes && (
                                                    <p className="text-sm text-slate-500 mt-0.5">{selected.notes}</p>
                                                )}
                                            </div>
                                            {!selected.is_active && (
                                                <button
                                                    onClick={() => handleActivate(selected.year)}
                                                    className="btn-primary text-sm py-1.5"
                                                >
                                                    Activate This Year
                                                </button>
                                            )}
                                        </div>

                                        {/* Notes field */}
                                        <div className="mb-4">
                                            <label className="label text-xs">Change Notes</label>
                                            <input
                                                type="text"
                                                value={(editState.notes as string) ?? ''}
                                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                                className="input-field text-sm"
                                                placeholder="e.g. 'Updated Grundfreibetrag per BMF 2027 announcement'"
                                            />
                                        </div>

                                        {/* Tariff zones */}
                                        <FieldGroup
                                            title="Income Tax Tariff (§32a EStG)"
                                            fields={[
                                                { key: 'grundfreibetrag', label: 'Grundfreibetrag (basic allowance)', unit: '€' },
                                                { key: 'zone2_limit', label: 'Zone 2 upper limit', unit: '€' },
                                                { key: 'zone3_limit', label: 'Zone 3 upper limit', unit: '€' },
                                                { key: 'zone4_limit', label: 'Zone 4 upper limit (top rate threshold)', unit: '€' },
                                                { key: 'zone2_coeff1', label: 'Zone 2 coefficient a' },
                                                { key: 'zone2_coeff2', label: 'Zone 2 coefficient b' },
                                                { key: 'zone3_coeff1', label: 'Zone 3 coefficient a' },
                                                { key: 'zone3_coeff2', label: 'Zone 3 coefficient b' },
                                                { key: 'zone3_offset', label: 'Zone 3 offset constant' },
                                                { key: 'zone4_rate', label: 'Zone 4 (42% tax) rate', unit: '%' },
                                                { key: 'zone4_offset', label: 'Zone 4 offset constant' },
                                                { key: 'zone5_rate', label: 'Zone 5 (top rate 45%)', unit: '%' },
                                                { key: 'zone5_offset', label: 'Zone 5 offset constant' },
                                            ]}
                                            editState={editState}
                                            onChange={handleFieldChange}
                                        />

                                        {/* Solidarity surcharge */}
                                        <FieldGroup
                                            title="Solidarity Surcharge (Solidaritätszuschlag)"
                                            fields={[
                                                { key: 'soli_rate', label: 'Soli rate', unit: '%' },
                                                { key: 'soli_freigrenze_single', label: 'Freigrenze (single)', unit: '€' },
                                                { key: 'soli_freigrenze_joint', label: 'Freigrenze (joint assessment)', unit: '€' },
                                            ]}
                                            editState={editState}
                                            onChange={handleFieldChange}
                                        />

                                        {/* Allowances */}
                                        <FieldGroup
                                            title="Allowances & Freibeträge"
                                            fields={[
                                                { key: 'werbungskosten_pauschale', label: 'Werbungskosten Pauschale', unit: '€' },
                                                { key: 'sonderausgaben_pauschale_single', label: 'Sonderausgaben Pauschale (single)', unit: '€' },
                                                { key: 'sonderausgaben_pauschale_joint', label: 'Sonderausgaben Pauschale (joint)', unit: '€' },
                                                { key: 'kinderfreibetrag', label: 'Kinderfreibetrag (both parents combined)', unit: '€' },
                                                { key: 'kindergeld_per_month', label: 'Kindergeld (monthly per child)', unit: '€' },
                                                { key: 'sparer_pauschbetrag', label: 'Sparer-Pauschbetrag (single / halved for joint)', unit: '€' },
                                            ]}
                                            editState={editState}
                                            onChange={handleFieldChange}
                                        />

                                        {/* Church tax */}
                                        <FieldGroup
                                            title="Church Tax (Kirchensteuer)"
                                            fields={[
                                                { key: 'kirchensteuer_rate_high', label: 'Standard rate (most Länder — 9%)', unit: '%' },
                                                { key: 'kirchensteuer_rate_low', label: 'Bavaria / Baden-Württemberg rate (8%)', unit: '%' },
                                            ]}
                                            editState={editState}
                                            onChange={handleFieldChange}
                                        />

                                        {/* Commute & home office */}
                                        <FieldGroup
                                            title="Work Deductions"
                                            fields={[
                                                { key: 'pendlerpauschale_per_km', label: 'Commute rate per km (Pendlerpauschale)', unit: '€' },
                                                { key: 'homeoffice_per_day', label: 'Home office daily flat rate', unit: '€' },
                                                { key: 'homeoffice_max_days', label: 'Home office max days per year' },
                                            ]}
                                            editState={editState}
                                            onChange={handleFieldChange}
                                        />

                                        {/* Retirement & insurance */}
                                        <FieldGroup
                                            title="Pension & Insurance Limits"
                                            fields={[
                                                { key: 'max_pension_deduction_single', label: 'Max deductible pension contributions (single)', unit: '€' },
                                                { key: 'max_pension_deduction_joint', label: 'Max deductible pension contributions (joint)', unit: '€' },
                                                { key: 'alimony_max', label: 'Alimony deduction limit (Unterhalt)', unit: '€' },
                                                { key: 'childcare_rate', label: 'Childcare deduction rate', unit: '%' },
                                                { key: 'childcare_max_per_child', label: 'Max childcare cost per child', unit: '€' },
                                                { key: 'ehrenamt_allowance', label: 'Ehrenamt allowance', unit: '€' },
                                                { key: 'uebungsleiter_allowance', label: 'Übungsleiter allowance', unit: '€' },
                                            ]}
                                            editState={editState}
                                            onChange={handleFieldChange}
                                        />

                                        {/* Capital income section removed — Abgeltungsteuer rate is fixed at 25% in §32d EStG, not a configurable parameter */}

                                        {/* Quick reference summary */}
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                                            <h3 className="text-sm font-semibold text-slate-600 mb-3">Current values quick reference</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                                                <div>Grundfreibetrag: <strong>{formatEuro(selected.grundfreibetrag)}</strong></div>
                                                <div>Werbungskosten: <strong>{formatEuro(selected.werbungskosten_pauschale)}</strong></div>
                                                <div>Kindergeld: <strong>{formatEuro(selected.kindergeld_per_month)}/mo</strong></div>
                                                <div>Soli Freigrenze: <strong>{formatEuro(selected.soli_freigrenze_single)}</strong></div>
                                                <div>Top rate from: <strong>{formatEuro(selected.zone4_limit)}</strong></div>
                                                <div>Status: <strong className={selected.is_active ? 'text-green-600' : 'text-slate-400'}>{selected.is_active ? 'Active' : 'Inactive'}</strong></div>
                                            </div>
                                        </div>

                                        {/* Save button */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="btn-primary px-6"
                                            >
                                                {saving ? 'Saving…' : 'Save Changes'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const p = params.find((x) => x.year === selectedYear)
                                                    if (p) setEditState({ ...p })
                                                }}
                                                className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
