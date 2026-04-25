/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05060b", // Deeper background
          900: "#0d0e1b", // Card background
          800: "#1e2030", // Borders
          700: "#2d304d", 
          600: "#3d4166",
        },
        brand: {
          primary: "#7c3aed", // Violet-600
          secondary: "#4f46e5", // Indigo-600
          glow: "rgba(124, 58, 237, 0.35)",
        },
        good: { 500: "#10b981" },
        warn: { 500: "#f59e0b" },
        bad:  { 500: "#ef4444" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
      }
    },
  },
  plugins: [],
};
