/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          bg: "#0B0F19",
          card: "#111827",
          border: "#1F2937",
          cyan: "#06B6D4",
          blue: "#3B82F6",
          red: "#EF4444",
          amber: "#F59E0B",
          emerald: "#10B981",
        }
      }
    },
  },
  plugins: [],
}
