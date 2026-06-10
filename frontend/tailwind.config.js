/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-tertiary": "#ffffff",
        "inverse-on-surface": "#eaf1ff",
        "tertiary-container": "#585be6",
        "on-tertiary-fixed-variant": "#2f2ebe",
        "error-container": "#ffdad6",
        "on-surface-variant": "#434655",
        "tertiary-fixed": "#e1e0ff",
        "tertiary": "#3e3fcc",
        "surface-container-high": "#dce9ff",
        "error": "#ba1a1a",
        "surface-container": "#e5eeff",
        "tertiary-fixed-dim": "#c0c1ff",
        "surface-container-low": "#eff4ff",
        "surface": "#f8f9ff",
        "inverse-primary": "#b4c5ff",
        "surface-bright": "#f8f9ff",
        "on-secondary": "#ffffff",
        "primary": "#004ac6",
        "secondary": "#006c49",
        "on-background": "#0b1c30",
        "on-tertiary-fixed": "#07006c",
        "primary-fixed-dim": "#b4c5ff",
        "outline": "#737686",
        "on-error": "#ffffff",
        "on-secondary-container": "#00714d",
        "surface-container-lowest": "#ffffff",
        "background": "#f8f9ff",
        "on-primary": "#ffffff",
        "on-primary-fixed-variant": "#003ea8",
        "on-tertiary-container": "#f1eeff",
        "primary-fixed": "#dbe1ff",
        "outline-variant": "#c3c6d7",
        "on-secondary-fixed": "#002113",
        "on-secondary-fixed-variant": "#005236",
        "on-surface": "#0b1c30",
        "on-primary-fixed": "#00174b",
        "secondary-container": "#6cf8bb",
        "on-primary-container": "#eeefff",
        "surface-tint": "#0053db",
        "surface-container-highest": "#d3e4fe",
        "surface-dim": "#cbdbf5",
        "secondary-fixed-dim": "#4edea3",
        "primary-container": "#2563eb",
        "inverse-surface": "#213145",
        "surface-variant": "#d3e4fe",
        "secondary-fixed": "#6ffbbe",
        "on-error-container": "#93000a"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "base": "4px",
        "2xl": "48px",
        "lg": "24px",
        "gutter": "24px",
        "sm": "8px",
        "xs": "4px",
        "container-max": "1440px",
        "3xl": "64px",
        "xl": "32px",
        "md": "16px"
      },
      fontFamily: {
        "headline-sm": ["Geist", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "display": ["Geist", "sans-serif"],
        "headline-md": ["Geist", "sans-serif"],
        "headline-lg": ["Geist", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "mono-data": ["JetBrains Mono", "monospace"],
        "body-lg": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"]
      },
      fontSize: {
        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "display": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "mono-data": ["13px", { "lineHeight": "16px", "fontWeight": "500" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
}
