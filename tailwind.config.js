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
          mint: '#cbf5d6',
          'mint-light': '#e6fced',
          'mint-dark': '#a9e3b9',
          'dark-green': '#052e0a',
          'green': '#297006',
          'green-light': '#328b08',
          'blue': '#3f51b5',
          'blue-dark': '#303f9f',
          'cyan': '#00bcd4',
          'orange': '#ff9800',
          'orange-hover': '#f57c00',
          'badge-border': '#808080',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'scan-line': 'scan 2.5s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '0.9' },
          '50%': { transform: 'translateY(280px)', opacity: '0.4' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.03)' },
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(6px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
