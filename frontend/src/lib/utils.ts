import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Format a number as Euro currency */
export function formatEuro(amount: number, showSign = false): string {
    const sign = showSign && amount > 0 ? '+' : ''
    return sign + new Intl.NumberFormat('en-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(amount))
}

/** Format a percentage */
export function formatPercent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}
