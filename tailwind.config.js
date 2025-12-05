/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Premium brand colors - matching website
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Accent colors - matching website hero
        accent: {
          cyan: "#06b6d4",
          lime: "#84cc16",
          purple: "#8b5cf6",
          pink: "#ec4899",
        },
        // Dark theme backgrounds - matching website hero
        dark: {
          900: "#0a0a0f",
          800: "#12121a",
          700: "#1a1a24",
          600: "#22222e",
        },
        // Surface colors for UI elements
        surface: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          850: "#1f1f23",
          900: "#18181b",
          950: "#09090b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["Manrope", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Consolas", "monospace"],
      },
      backgroundImage: {
        // Premium gradients matching website
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero":
          "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #082f49 100%)",
        "gradient-card":
          "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
        "gradient-glow":
          "radial-gradient(ellipse at center, rgba(14,165,233,0.15) 0%, transparent 70%)",
        "gradient-mesh": `
          radial-gradient(at 40% 20%, rgba(14,165,233,0.3) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(139,92,246,0.3) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(6,182,212,0.2) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(236,72,153,0.15) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(132,204,22,0.2) 0px, transparent 50%)
        `,
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
        "glass-lg": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        glow: "0 0 40px rgba(14, 165, 233, 0.3)",
        "glow-lg": "0 0 60px rgba(14, 165, 233, 0.4)",
        "glow-lime": "0 0 40px rgba(132, 204, 22, 0.3)",
        "glow-lime-lg": "0 0 60px rgba(132, 204, 22, 0.4)",
        "glow-accent": "0 0 40px rgba(139, 92, 246, 0.3)",
        "card-hover": "0 20px 40px -15px rgba(0, 0, 0, 0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "glow-lime": "glowLime 2s ease-in-out infinite alternate",
        float: "float 3s ease-in-out infinite",
        blob: "blob 7s infinite",
        shimmer: "shimmer 2s linear infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
      },
      keyframes: {
        glow: {
          "0%": {
            boxShadow: "0 0 20px rgba(14, 165, 233, 0.3)",
          },
          "100%": {
            boxShadow: "0 0 40px rgba(14, 165, 233, 0.6)",
          },
        },
        glowLime: {
          "0%": {
            boxShadow: "0 0 20px rgba(132, 204, 22, 0.3)",
          },
          "100%": {
            boxShadow: "0 0 40px rgba(132, 204, 22, 0.6)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
