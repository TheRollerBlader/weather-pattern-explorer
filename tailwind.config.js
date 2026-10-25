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
        climate: {
          deepblue: '#08306b',
          blue: '#2171b5',
          lightblue: '#6baed6',
          neutral: '#f7f7f7',
          lightred: '#fc9272',
          red: '#cb181d',
          darkred: '#67000d'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
