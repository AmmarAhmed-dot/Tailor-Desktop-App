/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e3a8a",
        secondary: "#1d4ed8",
      },
      fontFamily: {
        urdu: ["'Noto Nastaliq Urdu'", "serif"],
        sans: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
