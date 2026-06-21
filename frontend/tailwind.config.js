/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f3f8f6",
          100: "#dcece6",
          200: "#bad8cc",
          300: "#8ec0af",
          400: "#5ca28d",
          500: "#3e8570",
          600: "#2e6958",
          700: "#255449",
          800: "#21443d",
          900: "#1d3a34"
        }
      }
    },
  },
  plugins: [],
};
