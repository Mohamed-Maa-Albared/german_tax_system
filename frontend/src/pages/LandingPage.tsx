import { Calculator, Shield, TrendingUp, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="space-y-16">
            {/* Hero */}
            <section className="text-center py-16">
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                    German Tax Calculator
                    <span className="block text-brand-600 text-3xl sm:text-4xl mt-2">
                        §32a EStG — 2026
                    </span>
                </h1>
                <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
                    Accurate income tax estimation including Solidaritätszuschlag, Kirchensteuer, and
                    Kinderfreibetrag. Built for residents and expats.
                </p>
                <button
                    onClick={() => navigate('/wizard')}
                    className="px-8 py-3 bg-brand-600 text-white text-lg font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-md"
                >
                    Start Tax Calculation →
                </button>
            </section>

            {/* Features */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        icon: Calculator,
                        title: 'Accurate §32a',
                        desc: 'All 5 progressive tax zones with exact 2026 coefficients.',
                    },
                    {
                        icon: TrendingUp,
                        title: 'Full Breakdown',
                        desc: 'Soli, Kirchensteuer, capital gains, rental income.',
                    },
                    {
                        icon: Zap,
                        title: 'AI Hints',
                        desc: 'Powered by Ollama — explains tax terms in plain language.',
                    },
                    {
                        icon: Shield,
                        title: 'Private',
                        desc: 'Calculations run locally. No data stored.',
                    },
                ].map(({ icon: Icon, title, desc }) => (
                    <div
                        key={title}
                        className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm"
                    >
                        <Icon size={28} className="mx-auto text-brand-600 mb-3" />
                        <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                        <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                ))}
            </section>
        </div>
    )
}
