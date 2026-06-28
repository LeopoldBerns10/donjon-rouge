/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dr: {
          red: '#8B0000',
          'red-light': '#C0392B',
          black: '#111111',
          dark: '#1A1A1A',
          card: '#222222',
          border: '#333333',
          gold: '#FFD700',
          'gold-light': '#FFC107',
          text: '#E0E0E0',
          muted: '#888888',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
