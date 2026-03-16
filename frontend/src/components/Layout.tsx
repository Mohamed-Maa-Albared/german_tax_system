import { FileText, Settings, Sparkles } from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'
import ThemeToggle from './ThemeToggle'

interface LayoutProps {
    children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const location = useLocation()

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-deep)] transition-colors duration-300">
            <header className="bg-white dark:bg-sn-surface border-b border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none shrink-0">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Logo + brand name */}
                    <Link to="/" className="flex items-center gap-2.5 text-brand-700 dark:text-brand-400 font-heading font-bold text-lg">
                        <img
                            src="/calc_logo.png"
                            alt="SmartTax Germany"
                            className="h-9 w-9 object-contain"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                            }}
                        />
                        SmartTax Germany
                    </Link>

                    {/* Nav links */}
                    <nav className="flex items-center gap-1">
                        <Link
                            to="/wizard"
                            className={cn(
                                'text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                                location.pathname.startsWith('/wizard')
                                    ? 'bg-brand-100 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-white/5',
                            )}
                        >
                            Tax Calculator
                        </Link>
                        <Link
                            to="/advisor"
                            className={cn(
                                'flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                                location.pathname === '/advisor'
                                    ? 'bg-brand-100 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-white/5',
                            )}
                        >
                            <Sparkles size={14} />
                            AI Advisor
                        </Link>
                        <Link
                            to="/steuerbescheid"
                            className={cn(
                                'flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                                location.pathname === '/steuerbescheid'
                                    ? 'bg-brand-100 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-white/5',
                            )}
                        >
                            <FileText size={14} />
                            Check Bescheid
                        </Link>
                        <Link
                            to="/admin"
                            className={cn(
                                'flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                                location.pathname === '/admin'
                                    ? 'bg-brand-100 dark:bg-brand-600/20 text-brand-700 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-white/5',
                            )}
                        >
                            <Settings size={14} />
                            Admin
                        </Link>
                        <ThemeToggle />
                    </nav>
                </div>
            </header>
            <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">{children}</main>
            <footer className="shrink-0 border-t border-gray-200 dark:border-white/5 py-4 text-center text-xs text-gray-400 dark:text-slate-600 print:hidden">
                SmartTax Germany — Built on official §32a EStG formulas. Results are for guidance only
                and do not constitute legal or tax advice. Always verify with a qualified Steuerberater. © 2026
            </footer>
        </div>
    )
}
