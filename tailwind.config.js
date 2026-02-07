/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'govt-blue': '#1E3A8A',
        'govt-saffron': '#EA580C',
        'govt-green': '#15803D',
      }
    },
  },
  plugins: [],
}
