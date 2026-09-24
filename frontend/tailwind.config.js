/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Warm "golden hour" palette drawn from the hero photos (public/images).
      colors: {
        background: "#FBF6EF",
        sand: { DEFAULT: "#F5EBDD", dark: "#EADBC6" },
        surface: "#FFFFFF",
        // Terracotta; white text on it meets WCAG AA (4.9:1).
        primary: { DEFAULT: "#B4561F", hover: "#96461A", soft: "#FBE9DC" },
        ink: { DEFAULT: "#1F2A37", soft: "#334155" },
        gold: { DEFAULT: "#E9A23B", soft: "#FDF1DC" },
        text: { DEFAULT: "#1F2A37", muted: "#6B5E50" },
        border: "#EADFCF",
        error: { DEFAULT: "#B42318", soft: "#FDECEA" },
        success: { DEFAULT: "#1E7A4C", soft: "#E6F4EC" },
      },
      fontFamily: {
        sans: ['"Fira Sans"', "system-ui", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31, 42, 55, 0.04), 0 4px 16px rgba(31, 42, 55, 0.06)",
        lift: "0 8px 30px rgba(31, 42, 55, 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "typing-dot": {
          "0%, 80%, 100%": { opacity: "0.25", transform: "translateY(0)" },
          "40%": { opacity: "1", transform: "translateY(-2px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease-out both",
        "typing-dot": "typing-dot 1.2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
