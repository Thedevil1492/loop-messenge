/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        loop: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c7dbfe',
          300: '#a0c2fe',
          400: '#709ffd',
          500: '#4376fb',
          600: '#2b5bf4',
          700: '#2045e1',
          800: '#1e38b6',
          900: '#1e348f',
          950: '#142057',
        },
        cyanAccent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
      },
    },
  },
  plugins: [],
};
