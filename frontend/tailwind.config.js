/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kiosk: {
          bg: '#f0fdf4',
          card: '#ffffff',
          primary: '#15803d',
          primaryDark: '#166534',
          accent: '#22c55e',
          mint: '#cbf5d6',
          text: '#0f172a',
          muted: '#64748b',
          border: '#bbf7d0',
        },
        doctor: {
          sidebar: '#0f172a',
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#1e293b',
          primary: '#2563eb',
          danger: '#dc2626',
          warning: '#f59e0b',
          success: '#16a34a',
        },
      },
      fontSize: {
        'kiosk-xl': ['2.25rem', { lineHeight: '2.75rem' }],
        'kiosk-2xl': ['3rem', { lineHeight: '3.5rem' }],
      },
      minHeight: {
        'touch': '64px',
        'touch-lg': '80px',
      }
    },
  },
  plugins: [],
}
