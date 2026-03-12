import React, { useState } from 'react'
import { activateYear, adminLogin, copyYear, fetchAllParameters, setAdminToken, updateParameters } from '../lib/api'
import { TaxYearParameters } from '../types/tax'

export default function AdminPanel() {
    const [password, setPassword] = useState('')
    const [loggedIn, setLoggedIn] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [params, setParams] = useState<TaxYearParameters[]>([])
    const [copyTarget, setCopyTarget] = useState('')

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        try {
            const token = await adminLogin(password)
            setAdminToken(token)
            setLoggedIn(true)
            setError(null)
            const data = await fetchAllParameters()
            setParams(data)
        } catch {
            setError('Invalid password')
        }
    }

    async function handleActivate(year: number) {
        const updated = await activateYear(year)
        setParams((prev) =>
            prev.map((p) => ({ ...p, is_active: p.year === updated.year })),
        )
    }

    async function handleCopy(sourceYear: number) {
        const target = parseInt(copyTarget)
        if (!target || isNaN(target)) return
        const newParams = await copyYear(sourceYear, target)
        setParams((prev) => [...prev, newParams])
        setCopyTarget('')
    }

    async function handleUpdate(year: number, field: keyof TaxYearParameters, value: number) {
        const updated = await updateParameters(year, { [field]: value })
        setParams((prev) => prev.map((p) => (p.year === year ? updated : p)))
    }

    if (!loggedIn) {
        return (
            <div className="max-w-sm mx-auto mt-16">
                <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                    <h1 className="text-xl font-bold text-gray-800 mb-6">Admin Login</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <button
                            type="submit"
                            className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Tax Parameters Admin</h1>
                <button
                    onClick={() => { setLoggedIn(false); setAdminToken(null) }}
                    className="text-sm text-gray-400 hover:text-red-600"
                >
                    Logout
                </button>
            </div>

            {params.map((p) => (
                <div key={p.year} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {p.year}
                            {p.is_active && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    Active
                                </span>
                            )}
                        </h2>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                placeholder="Copy to year…"
                                value={copyTarget}
                                onChange={(e) => setCopyTarget(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-xs w-28"
                            />
                            <button
                                onClick={() => handleCopy(p.year)}
                                className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                Copy
                            </button>
                            {!p.is_active && (
                                <button
                                    onClick={() => handleActivate(p.year)}
                                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Activate
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <ParamField
                            label="Grundfreibetrag"
                            value={p.grundfreibetrag}
                            onSave={(v) => handleUpdate(p.year, 'grundfreibetrag', v)}
                        />
                        <ParamField
                            label="Zone2 Limit"
                            value={p.zone2_limit}
                            onSave={(v) => handleUpdate(p.year, 'zone2_limit', v)}
                        />
                        <ParamField
                            label="Zone3 Limit"
                            value={p.zone3_limit}
                            onSave={(v) => handleUpdate(p.year, 'zone3_limit', v)}
                        />
                        <ParamField
                            label="Kindergeld/month"
                            value={p.kindergeld_per_month}
                            onSave={(v) => handleUpdate(p.year, 'kindergeld_per_month', v)}
                        />
                        <ParamField
                            label="Kinderfreibetrag"
                            value={p.kinderfreibetrag}
                            onSave={(v) => handleUpdate(p.year, 'kinderfreibetrag', v)}
                        />
                        <ParamField
                            label="WK Pauschale"
                            value={p.werbungskosten_pauschale}
                            onSave={(v) => handleUpdate(p.year, 'werbungskosten_pauschale', v)}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

function ParamField({
    label,
    value,
    onSave,
}: {
    label: string
    value: number
    onSave: (v: number) => void
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(String(value))

    function save() {
        onSave(parseFloat(draft))
        setEditing(false)
    }

    return (
        <div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            {editing ? (
                <div className="flex gap-1">
                    <input
                        autoFocus
                        type="number"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="border border-brand-400 rounded px-1.5 py-0.5 text-xs w-24"
                        onKeyDown={(e) => e.key === 'Enter' && save()}
                    />
                    <button onClick={save} className="text-xs text-green-600 font-semibold">✓</button>
                    <button onClick={() => setEditing(false)} className="text-xs text-gray-400">✕</button>
                </div>
            ) : (
                <button
                    onClick={() => { setDraft(String(value)); setEditing(true) }}
                    className="font-medium text-gray-800 hover:text-brand-600 text-left"
                >
                    {value.toLocaleString('de-DE')}
                </button>
            )}
        </div>
    )
}
