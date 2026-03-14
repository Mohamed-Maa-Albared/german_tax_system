/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    900: '#1e3a8a',
                },
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
