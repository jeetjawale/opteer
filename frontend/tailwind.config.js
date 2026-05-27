/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        overlay: "var(--bg-overlay)",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-dim": "var(--accent-dim)",
        "accent-border": "var(--accent-border)",
        "score-high": "var(--score-high)",
        "score-mid": "var(--score-mid)",
        "score-low": "var(--score-low)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
      },
    },
  },
  plugins: [],
};
