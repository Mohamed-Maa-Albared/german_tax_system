/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Steuer Neural — Official Indigo accent palette
                brand: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    500: '#7c65e8',
                    600: '#5e4ad8',
                    700: '#4a3ab0',
                    900: '#2d1f8c',
                },
                // Steuer Neural surface / background utilities (dark mode)
                sn: {
                    deep: '#06080d',
                    surface: '#0c1017',
                    card: '#111622',
                    'card-hover': '#161d2e',
                    cyan: '#00d4ff',
                    'cyan-dark': '#0088a3',
                },
            },
            fontFamily: {
                // Space Grotesk — headings, buttons, hero
                heading: ['"Space Grotesk"', 'ui-sans-serif', 'sans-serif'],
                // JetBrains Mono — §refs, € values, metadata
                mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
            },
            typography: {
                sm: {
                    css: {
                        p: { marginTop: '0.4em', marginBottom: '0.4em' },
                        li: { marginTop: '0.15em', marginBottom: '0.15em' },
                        'ul, ol': { marginTop: '0.4em', marginBottom: '0.4em' },
                        h1: { fontSize: '1em', fontWeight: '700' },
                        h2: { fontSize: '0.95em', fontWeight: '700' },
                        h3: { fontSize: '0.9em', fontWeight: '600' },
                        code: { fontSize: '0.85em' },
                    },
                },
            },
        },
    },
    plugins: [require('@tailwindcss/typography')],
}
