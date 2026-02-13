/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sundaya: {
          primary: '#E73E3E',
          red: '#E73E3E',
          dark: '#C72C2C',
          light: '#FF5555',
          50: '#FEF2F2',
          100: '#FEE2E2',
        }
      }
    },
  },
  plugins: [],
}
