/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EAF3EF",
          100: "#CFE5DA",
          400: "#2E8C68",
          500: "#1F6F54",
          600: "#195943",
          700: "#134333",
        },
        ink: {
          900: "#182420",
          700: "#3C4A44",
          500: "#5C6B63",
          300: "#9AA8A0",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F6F7F5",
          border: "#E3E7E2",
        },
        amber: {
          500: "#B8792E",
          50: "#FBF1E3",
        },
        danger: {
          500: "#B23A32",
          50: "#FAEAE8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(24, 36, 32, 0.06), 0 1px 1px rgba(24, 36, 32, 0.04)",
      },
    },
  },
  plugins: [],
};
