import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sidebar: "#14171A",
        "sidebar-hover": "#1E2226",
        panel: "#F8FAFC",
        line: "#E2E8F0",
        muted: "#64748B",
        "accent-1": "#15803D",
        "accent-2": "#22C55E",
        danger: "#DC2626",
        "danger-bg": "#FEF2F2",
        warn: "#D97706",
        "warn-bg": "#FFFBEB",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
