/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blood: '#6B0000',
        crimson: '#C41E3A',
        ember: '#FF4500',
        gold: '#B8860B',
        'gold-bright': '#D4A017',
        'gold-light': '#F0C040',
        stone: '#0e0e0e',
        'stone-mid': '#181818',
        'stone-light': '#242424',
        fog: '#333333',
        ash: '#777777',
        bone: '#d4c5a9'
      },
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
        'cinzel-deco': ['"Cinzel Decorative"', 'serif'],
        body: ['"Segoe UI"', 'sans-serif']
      }
    }
  },
  plugins: []
}
