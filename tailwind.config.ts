import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
        },
        lime: {
          DEFAULT: "var(--lime)",
          dim: "var(--lime-dim)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
      },
      maxWidth: {
        "8xl": "90rem",
      },
      boxShadow: {
        glow: "0 0 0 1px var(--border), 0 8px 40px -8px rgba(110, 91, 255, 0.35)",
        "glow-lime": "0 0 0 1px rgba(214, 255, 78, 0.3), 0 8px 30px -6px rgba(214, 255, 78, 0.25)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Opacity + transform only — compositor-driven, no layout or repaint.
        backlight: {
          "0%, 100%": {
            opacity: "0.55",
            transform: "translate(-50%, -50%) scale(1)",
          },
          "50%": {
            opacity: "0.82",
            transform: "translate(-50%, -50%) scale(1.06)",
          },
        },
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        "fade-in": "fade-in 0.6s ease-out forwards",
        backlight: "backlight 9s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
