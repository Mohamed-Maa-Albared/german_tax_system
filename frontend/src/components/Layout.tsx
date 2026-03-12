import { Calculator, Settings } from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

interface LayoutProps {
    children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const location = useLocation()

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-brand-700 font-bold text-xl">
                        <Calculator size={24} />
                        SmartTax Germany
                    </Link>
                    <nav className="flex items-center gap-4">
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
            <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
            <footer className="border-t border-gray-200 mt-16 py-6 text-center text-xs text-gray-400">
                SmartTax Germany — §32a EStG calculator. Not legal tax advice. © 2026
            </footer>
        </div>
    )
}
