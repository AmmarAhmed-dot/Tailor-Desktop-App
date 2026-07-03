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
      },
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
