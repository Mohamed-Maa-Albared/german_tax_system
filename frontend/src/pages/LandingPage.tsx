import { FileText, Globe, Shield, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="space-y-16">
            {/* ── Hero ──────────────────────────────────────────────── */}
            <section className="text-center py-12">
                <div className="inline-block bg-brand-50 text-brand-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-brand-100">
                    🇩🇪 German Income Tax — 2026 Edition
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                    Your German Tax Return,
                    <span className="text-brand-600"> Simplified</span>
                </h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-3 leading-relaxed">
                    Answer a few plain-English questions and find out exactly how much tax you
                    should get back. Built for employees, freelancers, and expats — no German
                    tax knowledge required.
                </p>
                <p className="text-sm text-gray-400 mb-8">
                    Average refund for German employees:{' '}
                    <strong className="text-gray-600">€1,000+</strong>. Takes about 10 minutes.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate('/wizard')}
                        className="px-8 py-3.5 bg-brand-600 text-white text-lg font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-md"
                    >
                        Start Your Tax Return →
                    </button>
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs text-gray-400">
                    <span>✓ No account needed</span>
                    <span>✓ Your data never leaves your device</span>
                    <span>✓ Free to use</span>
                    <span>✓ Updated for 2026 tax law</span>
                </div>
            </section>

            {/* ── How it works ──────────────────────────────────────── */}
            <section>
                <h2 className="text-center text-2xl font-bold text-gray-800 mb-8">How it works</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                        {
                            step: '1',
                            title: 'Enter your income',
                            desc: 'Tell us about your salary and any other earnings. Every field has a plain-English explanation and tells you exactly where to find the number.',
                        },
                        {
                            step: '2',
                            title: 'Add your deductions',
                            desc: 'Commute to work, home office days, insurance contributions — we walk you through every deduction you may be entitled to.',
                        },
                        {
                            step: '3',
                            title: 'Get your estimate & file',
                            desc: 'See exactly how much you get back (or owe), download a filing summary, and follow our step-by-step instructions to submit.',
                        },
                    ].map(({ step, title, desc }) => (
                        <div key={step} className="relative bg-white rounded-2xl border border-gray-200 p-6 pt-8 shadow-sm">
                            <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center shadow-md">
                                {step}
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Feature cards ─────────────────────────────────────── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    {
                        icon: TrendingUp,
                        title: 'Legally accurate',
                        desc: 'Uses the official 2026 German tax formulas, cross-verified against the BMF tax calculator.',
                    },
                    {
                        icon: FileText,
                        title: 'Filing-ready package',
                        desc: 'Download a complete summary with step-by-step instructions on how to file with ELSTER.',
                    },
                    {
                        icon: Globe,
                        title: 'Made for expats',
                        desc: 'Every German tax term is explained in plain English. No prior knowledge needed.',
                    },
                    {
                        icon: Shield,
                        title: 'Private by design',
                        desc: 'Calculations run entirely in your browser. Nothing is ever stored or sent anywhere.',
                    },
                ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center mb-3 border border-brand-100">
                            <Icon size={20} className="text-brand-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                ))}
            </section>

            {/* ── Multi-year callout ─────────────────────────────────── */}
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-amber-900 mb-2">
                    ⏰ Never filed? You can claim up to 4 years back!
                </h2>
                <p className="text-sm text-amber-800 mb-5 leading-relaxed">
                    German law allows voluntary tax filing for up to 4 years after the end of the
                    tax year. If you've been working in Germany but never filed a return, you could
                    be owed thousands of euros in refunds. The 2022 deadline is <strong>31 December 2026</strong> — act now!
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { year: '2022', deadline: '31 Dec 2026', urgent: true },
                        { year: '2023', deadline: '31 Dec 2027', urgent: false },
                        { year: '2024', deadline: '31 Dec 2028', urgent: false },
                        { year: '2025', deadline: '31 Dec 2029', urgent: false },
                    ].map(({ year, deadline, urgent }) => (
                        <div
                            key={year}
                            className={`rounded-xl p-3 text-center border ${urgent ? 'bg-red-50 border-red-300' : 'bg-white border-amber-100'}`}
                        >
                            <p className={`text-2xl font-extrabold ${urgent ? 'text-red-600' : 'text-amber-900'}`}>{year}</p>
                            <p className={`text-xs mt-1 ${urgent ? 'text-red-600 font-semibold' : 'text-amber-700'}`}>
                                {urgent ? '⚠ Deadline: ' : 'Until '}{deadline}
                            </p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-amber-700 mt-4">
                    Select the tax year you want to calculate at the start of the wizard. You can run it separately for each year.
                </p>
            </section>
        </div>
    )
}
