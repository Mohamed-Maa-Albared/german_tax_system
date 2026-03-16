import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sn-theme'

/**
 * Light / dark mode toggle.
 *
 * Persists the user's preference to localStorage under `sn-theme`.
 * A blocking inline script in index.html reads the same key before the first
 * paint so there is no flash of the wrong theme on page load.
 *
 * The toggle works by adding / removing the `dark` class on <html>.
 * Tailwind's `darkMode: 'class'` strategy reads this class.
 */
export default function ThemeToggle() {
    const [dark, setDark] = useState(() => {
        // During SSR / test environments there may be no window — guard safely
        if (typeof window === 'undefined') return false
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored !== null) return stored === 'dark'
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        const root = document.documentElement
        if (dark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    }, [dark])

    return (
        <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50
                       dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-white/5
                       transition-colors"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    )
}
