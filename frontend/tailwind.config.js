/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#050816",
          900: "#0a0e1a",
          800: "#0f1629",
          700: "#151e3a",
          600: "#1a2747",
          500: "#1f2d56",
        },
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        violet: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        emerald: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        warn: {
          400: "#fbbf24",
          500: "#f59e0b",
        },
        danger: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
        },
        accent: {
          50: "#e0fcff",
          100: "#bef8fd",
          200: "#87eaf2",
          300: "#54d1db",
          400: "#38bec9",
          500: "#2cb1bc",
          600: "#14919b",
          700: "#0e7c86",
          800: "#0a6c74",
          900: "#044e54",
        },
      },
      fontFamily: {
        heading: ['"Outfit"', "system-ui", "sans-serif"],
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(99, 102, 241, 0.3)",
        "glow-lg": "0 0 40px rgba(99, 102, 241, 0.25)",
        "glow-violet": "0 0 30px rgba(139, 92, 246, 0.3)",
        "glow-cyan": "0 0 25px rgba(6, 182, 212, 0.3)",
        "inner-glow": "inset 0 0 20px rgba(99, 102, 241, 0.1)",
        "card-hover": "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "slide-down": "slideDown 0.4s ease-out forwards",
        "scale-in": "scaleIn 0.4s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "border-glow": "borderGlow 2s ease-in-out infinite alternate",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        borderGlow: {
          "0%": { borderColor: "rgba(99, 102, 241, 0.2)" },
          "100%": { borderColor: "rgba(139, 92, 246, 0.5)" },
        },
      },
      backgroundSize: {
        "300%": "300%",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
