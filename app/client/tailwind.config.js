/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#09090b',
          card: '#121215',
          surface: '#18181b',
          border: '#27272a',
          hover: '#27272a',
          muted: '#71717a',
        },
        mint: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        bubble: {
          outDark: '#064e3b',
          outLight: '#dcfce7',
          inDark: '#18181b',
          inLight: '#ffffff',
        },
      },
      borderRadius: {
        'bubble': '18px',
      },
    },
  },
  plugins: [],
};
