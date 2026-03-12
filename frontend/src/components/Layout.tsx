import { Link } from 'react-router-dom'

interface LayoutProps {
    children: React.ReactNode
    showNav?: boolean
}

export default function Layout({ children, showNav = true }: LayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {showNav && (
                <nav className="bg-brand-500 shadow-md sticky top-0 z-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2.5 text-white">
                            <img src="/logo.svg" alt="SmartTax Germany logo" className="w-8 h-8" />
                            <span className="font-bold text-lg tracking-tight">
                                SmartTax<span className="text-accent-400 font-extrabold"> Germany</span>
                            </span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Link
                                to="/wizard"
                                className="hidden sm:inline-flex items-center px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                File Your Taxes
                            </Link>
                        </div>
                    </div>
                </nav>
            )}
            <main className="flex-1">{children}</main>
            <footer className="bg-brand-900 text-slate-400 py-8 mt-auto">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm space-y-1">
                    <p className="text-slate-300 font-medium">SmartTax Germany</p>
                    <p>Tax calculations based on §32a EStG (Einkommensteuergesetz). For 2026 tax year.</p>
                    <p className="text-xs">Not legal or tax advice. Verify with a qualified tax advisor (Steuerberater) for complex situations.</p>
                </div>
            </footer>
        </div>
    )
}
