/** @type {import('tailwindcss').Config} */
// Direção visual "Azulejo": branco + azul cobalto, Bricolage Grotesque (títulos/números) + Work Sans (texto).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF2FB",
          100: "#D9E1F5",
          200: "#B4C3EA",
          400: "#3554B0",
          500: "#1E3A8A",
          600: "#192F72",
          700: "#13245A",
        },
        ink: {
          900: "#14213D",
          700: "#2E3A59",
          500: "#4A5578",
          300: "#8E97B3",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F4F6FB",
          border: "#DDE3F0",
        },
        success: {
          500: "#1F7A4D",
          50: "#E7F4EC",
        },
        amber: {
          500: "#A85A06",
          50: "#FDF3E1",
        },
        danger: {
          500: "#B42318",
          50: "#FDECEA",
        },
      },
      fontFamily: {
        sans: ["'Work Sans'", "system-ui", "sans-serif"],
        display: ["'Bricolage Grotesque'", "'Work Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 33, 61, 0.05)",
        pop: "0 12px 32px -8px rgba(20, 33, 61, 0.25)",
      },
    },
  },
  plugins: [],
};
