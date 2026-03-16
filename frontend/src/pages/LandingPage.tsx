import { FileText, Globe, Shield, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="space-y-16">
            {/* ── Hero ──────────────────────────────────────────────── */}
            <section className="text-center py-12">
                {/* Overline badge — JetBrains Mono per Steuer Neural spec */}
                <div className="inline-block bg-brand-600/10 dark:bg-brand-600/15 text-brand-700 dark:text-brand-400 text-[11px] font-mono uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-brand-600/20 dark:border-brand-600/30">
                    🇩🇪 German Income Tax — 2026 Edition
                </div>

                <h1 className="font-heading font-bold text-4xl sm:text-5xl text-gray-900 dark:text-slate-100 mb-4 leading-tight">
                    Your German Tax Return,{' '}
                    <span className="bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-400 dark:to-sn-cyan bg-clip-text text-transparent">
                        Simplified
                    </span>
                </h1>

                <p className="text-lg text-gray-500 dark:text-slate-400 max-w-2xl mx-auto mb-3 leading-relaxed">
                    Answer a few plain-English questions and find out exactly how much tax you
                    should get back. Built for employees, freelancers, and expats — no German
                    tax knowledge required.
                </p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mb-8">
                    Average refund for German employees:{' '}
                    <strong className="font-mono text-sn-cyan-dark dark:text-sn-cyan">€1,000+</strong>. Takes about 10 minutes.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate('/wizard')}
                        className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white text-base font-heading font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
                    >
                        Start Your Tax Return →
                    </button>
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs text-gray-400 dark:text-slate-600">
                    <span>✓ No account needed</span>
                    <span>✓ Your data never leaves your device</span>
                    <span>✓ Free to use</span>
                    <span>✓ Updated for 2026 tax law</span>
                </div>
            </section>

            {/* ── How it works ──────────────────────────────────────── */}
            <section>
                {/* JetBrains Mono section overline */}
                <p className="text-center font-mono text-[11px] uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
                    // How it works
                </p>
                <h2 className="text-center font-heading font-bold text-2xl text-gray-800 dark:text-slate-100 mb-8">
                    Three steps to your refund
                </h2>
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
                        <div
                            key={step}
                            className="relative bg-white dark:bg-sn-card rounded-2xl border border-gray-200 dark:border-white/5 p-6 pt-8 shadow-sm dark:shadow-none hover:border-brand-600/30 dark:hover:border-brand-600/30 transition-colors"
                        >
                            <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-heading font-bold flex items-center justify-center shadow-md">
                                {step}
                            </div>
                            <h3 className="font-heading font-semibold text-gray-800 dark:text-slate-200 mb-2">{title}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Feature cards ─────────────────────────────────────── */}
            <section>
                <p className="text-center font-mono text-[11px] uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
                    // Why SmartTax Germany
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        {
                            icon: TrendingUp,
                            overline: '§32a EStG',
                            title: 'Legally accurate',
                            desc: 'Uses the official 2026 German tax formulas, cross-verified against the BMF tax calculator.',
                        },
                        {
                            icon: FileText,
                            overline: 'ELSTER-ready',
                            title: 'Filing-ready package',
                            desc: 'Download a complete summary with step-by-step instructions on how to file with ELSTER.',
                        },
                        {
                            icon: Globe,
                            overline: 'Expat-friendly',
                            title: 'Made for expats',
                            desc: 'Every German tax term is explained in plain English. No prior knowledge needed.',
                        },
                        {
                            icon: Shield,
                            overline: 'Privacy-first',
                            title: 'Private by design',
                            desc: 'Calculations run entirely in your browser. Nothing is ever stored or sent anywhere.',
                        },
                    ].map(({ icon: Icon, overline, title, desc }) => (
                        <div
                            key={title}
                            className="bg-white dark:bg-sn-card rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm dark:shadow-none hover:border-brand-600/40 dark:hover:border-brand-600/30 transition-colors"
                        >
                            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">{overline}</p>
                            <div className="w-10 h-10 bg-brand-50 dark:bg-brand-600/10 rounded-lg flex items-center justify-center mb-3 border border-brand-100 dark:border-brand-600/20">
                                <Icon size={20} className="text-brand-600 dark:text-brand-400" />
                            </div>
                            <h3 className="font-heading font-semibold text-gray-800 dark:text-slate-200 mb-1">{title}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Multi-year callout ─────────────────────────────────── */}
            <section className="relative overflow-hidden rounded-2xl border border-brand-600/20 dark:border-brand-600/30 bg-gradient-to-br from-brand-50 to-white dark:from-sn-card dark:to-sn-surface p-6 sm:p-8">
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600 rounded-l-2xl" />

                <div className="pl-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
                        // Voluntary filing window
                    </p>
                    <h2 className="font-heading font-bold text-xl text-gray-900 dark:text-slate-100 mb-2">
                        Never filed? You can claim up to 4 years back.
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-5 leading-relaxed">
                        German law allows voluntary filing for up to 4 years after the end of the tax year.
                        If you've been working in Germany but never filed, you could be owed thousands.
                        The <strong className="text-gray-700 dark:text-slate-200">2022 deadline is 31 December 2026</strong> — act now.
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
                                className={`rounded-xl p-3 text-center border ${urgent
                                        ? 'bg-white dark:bg-sn-deep border-brand-600/40 dark:border-brand-600/50 ring-1 ring-brand-600/20'
                                        : 'bg-white/60 dark:bg-sn-deep/60 border-brand-600/10 dark:border-white/5'
                                    }`}
                            >
                                <p className={`text-2xl font-heading font-extrabold ${urgent ? 'text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-slate-300'
                                    }`}>
                                    {year}
                                </p>
                                <p className={`font-mono text-[10px] mt-1 ${urgent
                                        ? 'text-brand-600 dark:text-brand-400 font-semibold uppercase tracking-wide'
                                        : 'text-gray-400 dark:text-slate-500'
                                    }`}>
                                    {urgent ? '⚠ ' : ''}{deadline}
                                </p>
                            </div>
                        ))}
                    </div>

                    <p className="font-mono text-[10px] text-gray-400 dark:text-slate-600 mt-4">
                        Select the tax year at the start of the wizard. Run separately for each year.
                    </p>
                </div>
            </section>
        </div>
    )
}

