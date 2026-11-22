import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "forest-bg": "var(--color-bg)",
        "forest-surface": "var(--color-surface)",
        "forest-elevated": "var(--color-surface-elevated)",
        cream: "var(--color-text)",
        sand: "var(--color-accent)",
        sage: "var(--color-muted)",
        ink: "var(--color-ink)",
        terracotta: "var(--color-danger)",
        mint: "var(--color-success)",
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
        card: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-text)",
        },
        primary: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-ink)",
        },
        secondary: {
          DEFAULT: "var(--color-surface-elevated)",
          foreground: "var(--color-text)",
        },
        muted: {
          DEFAULT: "var(--color-surface-elevated)",
          foreground: "var(--color-muted)",
        },
        destructive: {
          DEFAULT: "var(--color-danger)",
          foreground: "var(--color-ink)",
        },
        border: "var(--color-ink)",
        input: "var(--color-ink)",
        ring: "var(--color-accent)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "var(--font-jakarta)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "brutal-sm": "var(--shadow-brutal-sm)",
        "brutal-md": "var(--shadow-brutal-md)",
        "brutal-hover": "var(--shadow-brutal-hover)",
        "brutal-gold": "var(--shadow-brutal-gold)",
        "brutal-danger": "var(--shadow-brutal-danger)",
      },
      borderWidth: {
        "2.5": "2.5px",
      },
      borderRadius: {
        bento: "1rem",
        control: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
