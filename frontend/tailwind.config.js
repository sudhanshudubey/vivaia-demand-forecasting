/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VIVAIA brand-ish palette — restrained, professional
        brand: {
          50:  "#f0f7f4",
          100: "#dceee5",
          200: "#bcdccc",
          300: "#8fc3a9",
          400: "#5fa384",
          500: "#1d9e75",
          600: "#0f7d5b",
          700: "#0c6349",
          800: "#0a503c",
          900: "#073729",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
