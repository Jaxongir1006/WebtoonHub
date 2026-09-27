/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Primary Lightning Amber
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03'
        },
        studio: {
          950: '#090a0f', // deepest background
          900: '#0f111a', // card & panel background
          850: '#151824', // elevated cards
          800: '#1c2030', // borders and inactive
          700: '#2a3046', // subtle hover / secondary
          600: '#3c4563',
          400: '#7481a5',
          300: '#9aa5c4',
          200: '#cbd3e6',
          100: '#f1f4fb'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'glow-brand': '0 0 25px -5px rgba(245, 158, 11, 0.45)',
        'glow-brand-lg': '0 0 45px -5px rgba(245, 158, 11, 0.6)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.45)',
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.45)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
