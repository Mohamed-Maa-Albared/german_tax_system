import { Settings, Sparkles } from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

interface LayoutProps {
    children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const location = useLocation()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 shadow-sm shrink-0">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 text-brand-700 font-bold text-xl">
                        <img
                            src="/logo.svg"
                            alt="SmartTax Germany"
                            className="h-9 w-9"
                            onError={(e) => {
                                // Fallback: hide broken img gracefully
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                            }}
                        />
                        SmartTax Germany
                    </Link>
                    <nav className="flex items-center gap-2">
                        <Link
                            to="/wizard"
                            className={cn(
                                'text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                                location.pathname.startsWith('/wizard')
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'text-gray-600 hover:text-brand-700',
                            )}
                        >
                            Tax Calculator
                        </Link>
                        <Link
                            to="/advisor"
                            className={cn(
                                'flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                                location.pathname === '/advisor'
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'text-gray-600 hover:text-brand-700',
                            )}
                        >
                            <Sparkles size={14} />
                            AI Advisor
                        </Link>
                        <Link
                            to="/admin"
                            className={cn(
                                'flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                                location.pathname === '/admin'
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'text-gray-600 hover:text-brand-700',
                            )}
                        >
                            <Settings size={14} />
                            Admin
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">{children}</main>
            <footer className="shrink-0 border-t border-gray-200 py-4 text-center text-xs text-gray-400 print:hidden">
                SmartTax Germany — German income tax estimator. Results are for guidance only and do not constitute legal or tax advice. Always verify with a qualified tax adviser (Steuerberater). © 2026
            </footer>
        </div>
    )
}
