import { ArrowRight, CheckCircle, Globe, RefreshCw, Shield, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const features = [
    {
        icon: <Globe size={24} className="text-accent-500" />,
        title: 'Plain English',
        desc: 'No confusing German forms. We guide you step-by-step in English with plain explanations for every field.',
    },
    {
        icon: <Zap size={24} className="text-accent-500" />,
        title: 'Instant Calculation',
        desc: 'See your estimated refund update in real time as you type — no waiting, no guessing.',
    },
    {
        icon: <RefreshCw size={24} className="text-accent-500" />,
        title: 'Always Up to Date',
        desc: 'Tax law changes every year (Grundfreibetrag, brackets, Pauschalen). Our admin updates parameters so you don\'t have to.',
    },
    {
        icon: <Shield size={24} className="text-accent-500" />,
        title: 'Privacy First',
        desc: 'No account required. Calculations run locally in your browser. Your data is never shared.',
    },
]

const steps = [
    { num: '1', title: 'Answer simple questions', desc: 'Our guided wizard asks about your income, deductions, and family situation — no tax jargon.' },
    { num: '2', title: 'We calculate your refund', desc: 'Our engine applies the exact §32a EStG formulas and finds every deduction you\'re entitled to.' },
    { num: '3', title: 'See your full breakdown', desc: 'View a detailed explanation of your refund (or payment), download a summary, and prepare your Steuererklärung.' },
]

export default function LandingPage() {
    return (
        <Layout>
            {/* Hero */}
            <section className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                        <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                        2026 Tax Season — Filing for 2025 Income
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
                        Your German Tax Return,
                        <br />
                        <span className="text-accent-400">Simplified</span>
                    </h1>
                    <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
                        SmartTax guides you through every step in plain English, maximises your
                        <strong className="text-white"> refund (Steuererstattung)</strong>, and ensures you pay exactly what you owe — nothing more.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/wizard"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                        >
                            Start My Tax Return
                            <ArrowRight size={20} />
                        </Link>
                        <a
                            href="#how-it-works"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-xl border border-white/20 transition-colors"
                        >
                            How it works
                        </a>
                    </div>

                    {/* Social proof */}
                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-blue-200">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle size={16} className="text-green-400" />
                            Average refund for employees: <strong className="text-white">€1,000+</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle size={16} className="text-green-400" />
                            Takes <strong className="text-white">20–30 minutes</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle size={16} className="text-green-400" />
                            <strong className="text-white">100% free</strong> to calculate
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <h2 className="text-3xl font-bold text-brand-500 text-center mb-3">
                        Built for expats, employees, and freelancers in Germany
                    </h2>
                    <p className="text-slate-500 text-center max-w-xl mx-auto mb-12 text-lg">
                        Filing taxes in Germany doesn't have to be stressful. SmartTax handles the complexity so you don't have to.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="card p-6 hover:shadow-card-hover transition-shadow">
                                <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mb-4">
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{f.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="py-20 bg-slate-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <h2 className="text-3xl font-bold text-brand-500 text-center mb-12">
                        How It Works
                    </h2>
                    <div className="space-y-8">
                        {steps.map((s, i) => (
                            <div key={i} className="flex gap-6 items-start">
                                <div className="w-12 h-12 bg-brand-500 text-white rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md">
                                    {s.num}
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{s.title}</h3>
                                    <p className="text-slate-500">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-12">
                        <Link
                            to="/wizard"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
                        >
                            Get Started — It's Free
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Important notice */}
            <section className="py-12 bg-amber-50 border-t border-amber-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <p className="text-sm text-amber-800">
                        <strong>Important:</strong> SmartTax Germany provides calculations for informational purposes only based on §32a EStG (2026).
                        It is not a substitute for professional tax advice (Steuerberatung). For complex situations (foreign income, multiple employers,
                        business income), consult a certified tax advisor (Steuerberater) or use official ELSTER filing.
                    </p>
                </div>
            </section>
        </Layout>
    )
}
